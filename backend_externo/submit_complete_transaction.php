<?php
/**
 * Endpoint para enviar una transacción completamente firmada (2 firmas)
 * Se usa cuando el segundo firmante completa la firma y se envía a Stellar
 */

// Deshabilitar display_errors para evitar output antes de headers
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

// CORS headers - DEBEN IR PRIMERO, ANTES DE CUALQUIER OTRO OUTPUT
$allowed_origins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://arcusx.one',
    'http://arcusx.one'
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

// Manejar preflight OPTIONS request PRIMERO
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    }
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 3600");
    http_response_code(200);
    exit();
}

// Headers CORS para requests normales
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

require_once 'config.php';
require __DIR__ . '/vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$secret_key = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY";

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
        error_log("JWT Error in submit_complete_transaction.php: " . $e->getMessage());
        return null;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $loggedInUserId = getLoggedInUserId($conn, $secret_key);

    if (is_null($loggedInUserId)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Acceso no autorizado']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $taskId = $data['task_id'] ?? null;
    $completeTxXdr = $data['complete_tx_xdr'] ?? null; // XDR con ambas firmas
    $txHash = $data['tx_hash'] ?? null; // Hash de la transacción enviada a Stellar

    if (!$taskId || !$completeTxXdr || !$txHash) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'task_id, complete_tx_xdr y tx_hash son requeridos']);
        exit;
    }

    $conn->begin_transaction();

    try {
        // Verificar que la tarea existe
        $stmt = $conn->prepare("
            SELECT user_id, accepted_applicant_id, pending_transaction_xdr, escrow_id
            FROM tasks 
            WHERE id = ? 
            FOR UPDATE
        ");
        $stmt->bind_param("i", $taskId);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            throw new Exception('Tarea no encontrada');
        }

        $taskData = $result->fetch_assoc();
        $stmt->close();

        // Verificar que el usuario es cliente o trabajador
        $isClient = $taskData['user_id'] == $loggedInUserId;
        $isWorker = $taskData['accepted_applicant_id'] == $loggedInUserId;

        if (!$isClient && !$isWorker) {
            throw new Exception('No tienes permisos para enviar esta transacción');
        }

        // Verificar que había una transacción pendiente
        if (empty($taskData['pending_transaction_xdr'])) {
            throw new Exception('No hay transacción pendiente para completar');
        }

        // Limpiar transacción pendiente y actualizar estado
        $stmt = $conn->prepare("
            UPDATE tasks 
            SET pending_transaction_xdr = NULL,
                pending_transaction_signer = NULL,
                escrow_status = 'funds_released',
                escrow_completed_at = NOW()
            WHERE id = ?
        ");
        $stmt->bind_param("i", $taskId);
        $stmt->execute();
        $stmt->close();

        // Eliminar mensajes del chat asociados a la tarea
        $stmt_delete_messages = $conn->prepare("DELETE FROM messages WHERE task_id = ?");
        if ($stmt_delete_messages === false) {
            error_log("Error al preparar el borrado de mensajes: " . $conn->error);
        } else {
            $stmt_delete_messages->bind_param("i", $taskId);
            if (!$stmt_delete_messages->execute()) {
                error_log("Error al borrar los mensajes: " . $stmt_delete_messages->error);
            }
            $stmt_delete_messages->close();
        }

        // Eliminar la tarea de la base de datos (ahora que los fondos están liberados)
        $stmt_delete_task = $conn->prepare("DELETE FROM tasks WHERE id = ?");
        if ($stmt_delete_task === false) {
            error_log("Error al preparar el borrado de la tarea: " . $conn->error);
        } else {
            $stmt_delete_task->bind_param("i", $taskId);
            if (!$stmt_delete_task->execute()) {
                error_log("Error al borrar la tarea: " . $stmt_delete_task->error);
            }
            $stmt_delete_task->close();
        }

        $conn->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Transacción completada y fondos liberados exitosamente',
            'tx_hash' => $txHash
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        error_log('Error en submit_complete_transaction.php: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }

    $conn->close();
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}
?>

