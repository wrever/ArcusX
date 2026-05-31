<?php
/**
 * Endpoint para obtener todas las tareas del cliente con acciones pendientes
 * GET /api/auth/get_pending_actions.php?user_id={user_id}
 * Headers: Authorization: Bearer {JWT_TOKEN}
 */

require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('GET, OPTIONS');
require_once 'config.php';
require_once 'vendor/autoload.php';
require_once __DIR__ . '/auth_bearer.php';

arcusx_cors_apply('GET, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $userId = arcusx_jwt_user_id();

    if ($userId === null) {
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
        
        if (
            ($row['status'] === 'in_progress' || $row['status'] === 'assigned') &&
            !empty($row['escrow_id']) &&
            $row['client_accepted_completion'] == 0
        ) {
            $pendingActions[] = [
                'type' => 'client_approve_release',
                'message' => 'Revisa la entrega y libera los fondos cuando estés conforme',
                'worker_id' => $row['accepted_applicant_id']
            ];
        }

        if ($row['worker_accepted_completion'] == 1 && $row['client_accepted_completion'] == 0) {
            $pendingActions[] = [
                'type' => 'worker_delivery_notified',
                'message' => 'El trabajador notificó que terminó (informativo). Tú decides si liberar.',
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

