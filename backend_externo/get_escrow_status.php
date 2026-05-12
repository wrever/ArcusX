<?php
// get_escrow_status.php

require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('GET, OPTIONS');
require_once 'config.php';
require __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/auth_bearer.php';

arcusx_cors_apply('GET, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $loggedInUserId = arcusx_jwt_user_id();

    if ($loggedInUserId === null) {
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

        // El sistema ahora usa exclusivamente Trustless Work
        // El balance debe obtenerse desde el indexer de Trustless Work (frontend)
        // No consultamos Horizon API aquí
        $balance = null;

        echo json_encode([
            'success' => true,
            'escrow' => [
                'escrow_id' => $escrowData['escrow_id'],
                'escrow_status' => $escrowData['escrow_status'],
                'task_status' => $escrowData['task_status'],
                'escrow_created_at' => $escrowData['escrow_created_at'],
                'escrow_completed_at' => $escrowData['escrow_completed_at'],
                'balance' => $balance, // null - debe obtenerse desde Trustless Work indexer (frontend)
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

