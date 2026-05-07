<?php
/**
 * Endpoint para obtener disputas del usuario que requieren su firma
 * GET /api/auth/get_user_disputes.php
 * Headers: Authorization: Bearer {JWT_TOKEN}
 * 
 * Retorna disputas resueltas donde el usuario es cliente o trabajador
 * y necesita firmar una transacción para liberar fondos
 */

require_once 'config.php';
require_once 'vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

header('Content-Type: application/json; charset=UTF-8');

// Headers CORS
$_cors_origin = (function(){ $o=$_SERVER["HTTP_ORIGIN"]??""; return in_array($o,["http://localhost:5173","http://localhost:5174","https://arcusx.pro","http://arcusx.pro"],true)?$o:"https://arcusx.pro"; })(); header("Access-Control-Allow-Origin: ".$_cors_origin);
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}


function getLoggedInUserId($conn, $secret_key) {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $jwt = $matches[1];
        try {
            JWT::$leeway = 300;
            $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));
            if (isset($decoded->data->id)) {
                return (int)$decoded->data->id;
            }
        } catch (Exception $e) {
            error_log("JWT Error en get_user_disputes.php: " . $e->getMessage());
            return null;
        }
    }
    return null;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $userId = getLoggedInUserId($conn, $jwt_secret);
    
    if (!$userId) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Acceso no autorizado: Token JWT no proporcionado o inválido.'
        ]);
        $conn->close();
        exit;
    }
    
    try {
        // Obtener disputas resueltas donde el usuario es cliente o trabajador
        // y el escrow está en estado 'pending_dispute_resolution'
        $sql = "
            SELECT 
                d.id as dispute_id,
                d.status as dispute_status,
                d.resolution,
                d.created_at as dispute_created_at,
                d.resolved_at,
                t.id as task_id,
                t.title as task_title,
                t.price,
                t.escrow_id,
                t.escrow_status,
                t.user_id as client_id,
                t.accepted_applicant_id as worker_id,
                u1.username as client_username,
                u2.username as worker_username,
                u1.wallet_address as client_wallet,
                u2.wallet_address as worker_wallet
            FROM disputes d
            INNER JOIN tasks t ON d.task_id = t.id
            LEFT JOIN users u1 ON t.user_id = u1.id
            LEFT JOIN users u2 ON t.accepted_applicant_id = u2.id
            WHERE d.status = 'resolved'
            AND t.escrow_status = 'pending_dispute_resolution'
            AND (t.user_id = ? OR t.accepted_applicant_id = ?)
            ORDER BY d.resolved_at DESC
        ";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $userId, $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $disputes = [];
        while ($row = $result->fetch_assoc()) {
            // Parsear resolución
            $resolution = json_decode($row['resolution'], true);
            
            // Determinar si el usuario necesita firmar
            $needsSignature = false;
            $userRole = null; // 'client' o 'worker'
            $refundAmount = 0;
            $paymentAmount = 0;
            
            if ($row['client_id'] == $userId) {
                $userRole = 'client';
                // Si la decisión es a favor del cliente o split, necesita firmar para recibir reembolso
                if ($resolution && isset($resolution['decision'])) {
                    if ($resolution['decision'] === 'client' || $resolution['decision'] === 'split') {
                        $needsSignature = true;
                        $refundAmount = isset($resolution['refund_to_client']) ? (float)$resolution['refund_to_client'] : 0;
                    }
                }
            } elseif ($row['worker_id'] == $userId) {
                $userRole = 'worker';
                // Si la decisión es a favor del trabajador o split, necesita firmar para recibir pago
                if ($resolution && isset($resolution['decision'])) {
                    if ($resolution['decision'] === 'worker' || $resolution['decision'] === 'split') {
                        $needsSignature = true;
                        $paymentAmount = isset($resolution['pay_to_worker']) ? (float)$resolution['pay_to_worker'] : 0;
                    }
                }
            }
            
            if ($needsSignature) {
                $disputes[] = [
                    'dispute_id' => (int)$row['dispute_id'],
                    'task_id' => (int)$row['task_id'],
                    'task_title' => $row['task_title'],
                    'price' => (float)$row['price'],
                    'escrow_id' => $row['escrow_id'],
                    'user_role' => $userRole,
                    'decision' => $resolution['decision'] ?? null,
                    'refund_amount' => $refundAmount,
                    'payment_amount' => $paymentAmount,
                    'resolved_at' => $row['resolved_at'],
                    'resolution_reason' => $resolution['reason'] ?? null
                ];
            }
        }
        $stmt->close();
        
        echo json_encode([
            'success' => true,
            'disputes' => $disputes,
            'count' => count($disputes)
        ]);
        
    } catch (Exception $e) {
        error_log('Error en get_user_disputes.php: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al obtener disputas: ' . $e->getMessage()
        ]);
    }
    
    $conn->close();
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido'
    ]);
}
?>

