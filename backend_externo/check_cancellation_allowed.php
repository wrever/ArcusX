<?php
/**
 * check_cancellation_allowed.php
 * Endpoint para verificar si la cancelación de una tarea está permitida
 * GET /api/auth/check_cancellation_allowed.php?task_id={id}
 * Headers: Authorization: Bearer {JWT_TOKEN}
 */

require_once 'config.php';

$autoload_path = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoload_path)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en el servidor: Falta la carpeta de dependencias (vendor).'
    ]);
    exit();
}
require $autoload_path;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// Headers CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$jwt_secret = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY";

/**
 * Obtener el ID del usuario autenticado desde el JWT
 */
function getLoggedInUserId($conn, $secret_key) {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    if (empty($authHeader) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }
    
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $jwt = $matches[1];
        try {
            JWT::$leeway = 300;
            $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));
            if (isset($decoded->data->id)) {
                return (int)$decoded->data->id;
            }
        } catch (Exception $e) {
            error_log("JWT Error en check_cancellation_allowed.php: " . $e->getMessage());
            return null;
        }
    }
    return null;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
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
        
        // Obtener task_id de query parameters
        $taskId = isset($_GET['task_id']) ? intval($_GET['task_id']) : 0;
        
        if ($taskId <= 0) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'task_id inválido o no proporcionado.'
            ]);
            $conn->close();
            exit;
        }
        
        // Obtener información de la tarea
        $stmt = $conn->prepare("
            SELECT 
                id, 
                user_id, 
                accepted_applicant_id, 
                status, 
                escrow_id, 
                escrow_status,
                created_at,
                worker_started_at
            FROM tasks 
            WHERE id = ?
        ");
        
        if ($stmt === false) {
            throw new Exception('Error al preparar consulta: ' . $conn->error);
        }
        
        $stmt->bind_param("i", $taskId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            $stmt->close();
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Tarea no encontrada.'
            ]);
            $conn->close();
            exit;
        }
        
        $task = $result->fetch_assoc();
        $stmt->close();
        
        // Verificar que el usuario es el cliente (dueño de la tarea)
        if ((int)$task['user_id'] !== $userId) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'No tienes permiso para cancelar esta tarea. Solo el cliente puede cancelar.'
            ]);
            $conn->close();
            exit;
        }
        
        // Verificar estado de la tarea
        $currentStatus = $task['status'];
        $escrowStatus = $task['escrow_status'];
        $escrowId = $task['escrow_id'];
        
        // BLOQUEAR si la tarea ya está completada
        if ($currentStatus === 'completed') {
            echo json_encode([
                'success' => true,
                'allowed' => false,
                'reason' => 'La tarea ya está completada y pagada. No se puede cancelar.',
                'requires_dispute' => false,
                'can_refund' => false,
                'refund_percentage' => 0,
                'worker_protection' => [
                    'has_started' => !empty($task['worker_started_at']),
                    'has_deliveries' => false,
                    'hours_since_assignment' => 0,
                    'has_messages' => false
                ]
            ]);
            $conn->close();
            exit;
        }
        
        // BLOQUEAR si no hay escrow configurado
        if (empty($escrowId)) {
            echo json_encode([
                'success' => true,
                'allowed' => false,
                'reason' => 'No hay escrow configurado para esta tarea. No se puede procesar reembolso.',
                'requires_dispute' => false,
                'can_refund' => false,
                'refund_percentage' => 0,
                'worker_protection' => [
                    'has_started' => !empty($task['worker_started_at']),
                    'has_deliveries' => false,
                    'hours_since_assignment' => 0,
                    'has_messages' => false
                ]
            ]);
            $conn->close();
            exit;
        }
        
        // Verificar si trabajador ha comenzado
        $workerStartedAt = $task['worker_started_at'];
        $hasStarted = !empty($workerStartedAt);
        
        // Verificar entregas del trabajador
        // Primero verificar si la tabla task_progress existe
        $checkTable = $conn->query("SHOW TABLES LIKE 'task_progress'");
        $hasDeliveries = false;
        if ($checkTable !== false && $checkTable->num_rows > 0) {
            $deliveryStmt = $conn->prepare("
                SELECT COUNT(*) as count 
                FROM task_progress 
                WHERE task_id = ? 
                AND user_id = ? 
                AND progress_type = 'delivery'
            ");
            if ($deliveryStmt !== false && !empty($task['accepted_applicant_id'])) {
                $workerId = (int)$task['accepted_applicant_id'];
                $deliveryStmt->bind_param("ii", $taskId, $workerId);
                $deliveryStmt->execute();
                $deliveryResult = $deliveryStmt->get_result();
                if ($deliveryResult->num_rows > 0) {
                    $deliveryRow = $deliveryResult->fetch_assoc();
                    $hasDeliveries = (int)$deliveryRow['count'] > 0;
                }
                $deliveryStmt->close();
            }
        }
        
        // Verificar mensajes con palabras clave de progreso
        $hasMessages = false;
        $messageStmt = $conn->prepare("
            SELECT COUNT(*) as count 
            FROM messages 
            WHERE task_id = ? 
            AND sender_id = ? 
            AND (
                message LIKE '%empecé%' OR
                message LIKE '%empece%' OR
                message LIKE '%avanzando%' OR
                message LIKE '%casi listo%' OR
                message LIKE '%terminé%' OR
                message LIKE '%termine%' OR
                message LIKE '%completado%' OR
                message LIKE '%finalizado%'
            )
        ");
        if ($messageStmt !== false && !empty($task['accepted_applicant_id'])) {
            $workerId = (int)$task['accepted_applicant_id'];
            $messageStmt->bind_param("ii", $taskId, $workerId);
            $messageStmt->execute();
            $messageResult = $messageStmt->get_result();
            if ($messageResult->num_rows > 0) {
                $messageRow = $messageResult->fetch_assoc();
                $hasMessages = (int)$messageRow['count'] > 0;
            }
            $messageStmt->close();
        }
        
        // Calcular horas desde asignación
        $hoursSinceAssignment = 0;
        if (!empty($task['accepted_applicant_id']) && !empty($task['created_at'])) {
            $createdAt = new DateTime($task['created_at']);
            $now = new DateTime();
            $diff = $now->diff($createdAt);
            $hoursSinceAssignment = ($diff->days * 24) + $diff->h;
        }
        
        // Determinar si cancelación está permitida
        $allowed = false;
        $requiresDispute = false;
        $reason = '';
        
        // PERMITIR si:
        // - Trabajador NO ha comenzado
        // - NO hay entregas
        // - Menos de 24 horas desde asignación O trabajador no ha marcado progreso
        // - NO hay mensajes indicando progreso
        
        if ($hasStarted || $hasDeliveries || $hasMessages) {
            // Trabajador ya comenzó o hay evidencia de trabajo
            $allowed = false;
            $requiresDispute = true;
            $reason = 'El trabajador ya ha comenzado a trabajar. Para cancelar, debes iniciar una disputa.';
        } elseif ($hoursSinceAssignment >= 24 && !empty($task['accepted_applicant_id'])) {
            // Más de 24 horas y hay trabajador asignado
            $allowed = false;
            $requiresDispute = true;
            $reason = 'Han pasado más de 24 horas desde la asignación. Para cancelar, debes iniciar una disputa.';
        } else {
            // Cancelación permitida
            $allowed = true;
            $requiresDispute = false;
            $reason = 'Cancelación permitida. El trabajador no ha comenzado y no hay entregas.';
        }
        
        // Verificar si se puede procesar reembolso
        $canRefund = !empty($escrowId) && ($escrowStatus === 'active' || $escrowStatus === 'funded');
        $refundPercentage = $allowed ? 100 : 0;
        
        echo json_encode([
            'success' => true,
            'allowed' => $allowed,
            'reason' => $reason,
            'requires_dispute' => $requiresDispute,
            'can_refund' => $canRefund,
            'refund_percentage' => $refundPercentage,
            'worker_protection' => [
                'has_started' => $hasStarted,
                'has_deliveries' => $hasDeliveries,
                'hours_since_assignment' => $hoursSinceAssignment,
                'has_messages' => $hasMessages
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error interno del servidor: ' . $e->getMessage()
        ]);
    } finally {
        $conn->close();
    }
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido. Use GET.'
    ]);
    $conn->close();
}
?>

