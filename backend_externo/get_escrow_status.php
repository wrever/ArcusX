<?php
// get_escrow_status.php

// CORS headers
$allowed_origins = [
    'http://localhost:5173',
    'https://arcusx.one',
    'http://arcusx.one'
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Manejar preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php';
require __DIR__ . '/vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$secret_key = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY";

// Función para obtener el ID del usuario logueado desde el token JWT
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
        } else {
            return null;
        }
    } catch (Exception $e) {
        error_log("JWT Error in get_escrow_status.php: " . $e->getMessage());
        return null;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $loggedInUserId = getLoggedInUserId($conn, $secret_key);

    if (is_null($loggedInUserId)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Acceso no autorizado']);
        exit;
    }

    // Obtener task_id o escrow_id de los parámetros GET
    $taskId = isset($_GET['task_id']) ? intval($_GET['task_id']) : null;
    $escrowId = isset($_GET['escrow_id']) ? trim($_GET['escrow_id']) : null;

    if (!$taskId && !$escrowId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'task_id o escrow_id requerido']);
        exit;
    }

    try {
        // Construir query según parámetros
        if ($taskId) {
            $stmt = $conn->prepare("
                SELECT 
                    t.id as task_id,
                    t.escrow_id,
                    t.escrow_status,
                    t.escrow_created_at,
                    t.escrow_completed_at,
                    t.status as task_status,
                    t.user_id as client_id,
                    t.accepted_applicant_id as worker_id
                FROM tasks t
                WHERE t.id = ? AND (t.user_id = ? OR t.accepted_applicant_id = ?)
            ");
            $stmt->bind_param("iii", $taskId, $loggedInUserId, $loggedInUserId);
        } else {
            $stmt = $conn->prepare("
                SELECT 
                    t.id as task_id,
                    t.escrow_id,
                    t.escrow_status,
                    t.escrow_created_at,
                    t.escrow_completed_at,
                    t.status as task_status,
                    t.user_id as client_id,
                    t.accepted_applicant_id as worker_id
                FROM tasks t
                WHERE t.escrow_id = ? AND (t.user_id = ? OR t.accepted_applicant_id = ?)
            ");
            $stmt->bind_param("sii", $escrowId, $loggedInUserId, $loggedInUserId);
        }

        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Escrow no encontrado o no tienes permisos']);
            exit;
        }

        $escrowData = $result->fetch_assoc();

        // (Opcional) Consultar balance en Stellar Horizon API
        $balance = null;
        if ($escrowData['escrow_id']) {
            try {
                $horizonUrl = "https://horizon-testnet.stellar.org/accounts/{$escrowData['escrow_id']}";
                $ch = curl_init($horizonUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($httpCode === 200) {
                    $accountData = json_decode($response, true);
                    $nativeBalance = array_filter($accountData['balances'], function($b) {
                        return $b['asset_type'] === 'native';
                    });
                    if (!empty($nativeBalance)) {
                        $balance = reset($nativeBalance)['balance'];
                    }
                }
            } catch (Exception $e) {
                error_log("Error consultando balance en Stellar: " . $e->getMessage());
                // Continuar sin balance
            }
        }

        echo json_encode([
            'success' => true,
            'escrow' => [
                'escrow_id' => $escrowData['escrow_id'],
                'escrow_status' => $escrowData['escrow_status'],
                'task_status' => $escrowData['task_status'],
                'escrow_created_at' => $escrowData['escrow_created_at'],
                'escrow_completed_at' => $escrowData['escrow_completed_at'],
                'balance' => $balance,
                'task_id' => $escrowData['task_id'],
                'client_id' => $escrowData['client_id'],
                'worker_id' => $escrowData['worker_id']
            ]
        ]);

    } catch (Exception $e) {
        error_log('Error en get_escrow_status.php: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error interno del servidor']);
    }

    $conn->close();

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}
?>

