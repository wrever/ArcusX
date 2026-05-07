<?php
/**
 * Endpoint para obtener todas las tareas del cliente con acciones pendientes
 * GET /api/auth/get_pending_actions.php?user_id={user_id}
 * Headers: Authorization: Bearer {JWT_TOKEN}
 */

require_once 'config.php';
require_once 'vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// Headers CORS
$_cors_origin = (function(){ $o=$_SERVER["HTTP_ORIGIN"]??""; return in_array($o,["http://localhost:5173","http://localhost:5174","https://arcusx.pro","http://arcusx.pro"],true)?$o:"https://arcusx.pro"; })(); header("Access-Control-Allow-Origin: ".$_cors_origin);
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$secret_key = $jwt_secret;

function getLoggedInUserId($conn, $secret_key) {
    $headers = getallheaders();
    if (!isset($headers['Authorization'])) {
        return null;
    }
    $authHeader = $headers['Authorization'];
    if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        return null;
    }
    $jwt = $matches[1];
    try {
        $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));
        if (isset($decoded->data->id)) {
            return (string) $decoded->data->id;
        }
        return null;
    } catch (Exception $e) {
        return null;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $userId = getLoggedInUserId($conn, $secret_key);
    
    if (!$userId) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit;
    }
    
    // Obtener todas las tareas del cliente con acciones pendientes
    $sql = "SELECT 
                t.id,
                t.title,
                t.subtitle,
                t.status,
                t.client_accepted_completion,
                t.worker_accepted_completion,
                t.accepted_applicant_id,
                t.escrow_id,
                t.pending_transaction_xdr,
                t.pending_transaction_signer,
                u.username AS worker_username,
                u.email AS worker_email,
                (SELECT COUNT(*) FROM messages m WHERE m.task_id = t.id AND m.receiver_id = ? AND m.is_read = 0) AS unread_messages
            FROM tasks t
            LEFT JOIN users u ON t.accepted_applicant_id = u.id
            WHERE t.user_id = ? 
            AND t.accepted_applicant_id IS NOT NULL
            AND t.status != 'completed'
            ORDER BY t.created_at DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $userId, $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $pendingTasks = [];
    
    while ($row = $result->fetch_assoc()) {
        $pendingActions = [];
        
        // Verificar acciones pendientes del trabajador
        if ($row['status'] === 'in_progress' || $row['status'] === 'assigned') {
            // Trabajador debe marcar completado
            if ($row['worker_accepted_completion'] == 0) {
                $pendingActions[] = [
                    'type' => 'worker_complete',
                    'message' => 'El trabajador debe marcar la tarea como completada',
                    'worker_id' => $row['accepted_applicant_id']
                ];
            }
        }
        
        // Verificar acciones pendientes del cliente
        // Para Trustless Work: cliente debe aprobar milestone y liberar fondos
        if ($row['worker_accepted_completion'] == 1 && $row['client_accepted_completion'] == 0) {
            $pendingActions[] = [
                'type' => 'client_approve_release',
                'message' => 'Debes aprobar el milestone y liberar los fondos',
                'worker_id' => $row['accepted_applicant_id']
            ];
        }
        
        // Si hay acciones pendientes, agregar la tarea
        if (!empty($pendingActions)) {
            $pendingTasks[] = [
                'task_id' => $row['id'],
                'title' => $row['title'],
                'subtitle' => $row['subtitle'],
                'status' => $row['status'],
                'worker_username' => $row['worker_username'],
                'worker_email' => $row['worker_email'],
                'worker_id' => $row['accepted_applicant_id'],
                'pending_actions' => $pendingActions,
                'unread_messages' => (int)$row['unread_messages']
            ];
        }
    }
    
    $stmt->close();
    
    echo json_encode([
        'success' => true,
        'pending_tasks' => $pendingTasks,
        'total_pending' => count($pendingTasks)
    ]);
    
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}

$conn->close();
?>

