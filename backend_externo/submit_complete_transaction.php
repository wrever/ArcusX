<?php
/**
 * DEPRECATED: Este endpoint ya no se usa.
 * El sistema ahora usa exclusivamente Trustless Work para manejar escrows.
 * Trustless Work maneja todas las transacciones directamente a través de su API.
 * 
 * Este archivo se mantiene solo para referencia histórica.
 * 
 * @deprecated Desde la migración a Trustless Work
 */

// Deshabilitar display_errors para evitar output antes de headers
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('POST, OPTIONS');

require_once 'config.php';
require __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/auth_bearer.php';

arcusx_cors_apply('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $loggedInUserId = arcusx_jwt_user_id();

    if ($loggedInUserId === null) {
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
            SELECT user_id, accepted_applicant_id, pending_transaction_xdr, escrow_id, escrow_status
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

        // Este endpoint ya no se usa - Trustless Work maneja todo directamente
        throw new Exception('Este endpoint está deprecado. El sistema ahora usa exclusivamente Trustless Work para manejar escrows. Los fondos se liberan directamente a través de Trustless Work API.');

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

