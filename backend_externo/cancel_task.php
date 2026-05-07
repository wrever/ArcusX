<?php
/**
 * cancel_task.php
 * Endpoint para cancelar una tarea y procesar reembolso
 * POST /api/auth/cancel_task.php
 * Headers: Authorization: Bearer {JWT_TOKEN}
 * Body: { "task_id": 123, "reason": "string (opcional)", "tx_hash": "string (después de firmar)" }
 * 
 * NOTA: Este endpoint valida y prepara la cancelación.
 * El reembolso real se procesa en el frontend con Trustless Work.
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
$_cors_origin = (function(){ $o=$_SERVER["HTTP_ORIGIN"]??""; return in_array($o,["http://localhost:5173","http://localhost:5174","https://arcusx.pro","http://arcusx.pro"],true)?$o:"https://arcusx.pro"; })(); header("Access-Control-Allow-Origin: ".$_cors_origin);
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}


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
            error_log("JWT Error en cancel_task.php: " . $e->getMessage());
            return null;
        }
    }
    return null;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
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
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['task_id'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'task_id requerido.'
            ]);
            $conn->close();
            exit;
        }
        
        $taskId = intval($data['task_id']);
        $reason = isset($data['reason']) ? trim($data['reason']) : null;
        $txHash = isset($data['tx_hash']) ? trim($data['tx_hash']) : null;
        
        if ($taskId <= 0) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'task_id inválido.'
            ]);
            $conn->close();
            exit;
        }
        
        // Obtener información de la tarea
        // Verificar si la columna escrow_amount existe
        $checkEscrowAmount = $conn->query("SHOW COLUMNS FROM tasks LIKE 'escrow_amount'");
        $hasEscrowAmount = ($checkEscrowAmount !== false && $checkEscrowAmount->num_rows > 0);
        
        $selectFields = "
            id, 
            user_id, 
            accepted_applicant_id, 
            status, 
            escrow_id, 
            escrow_status,
            price,
            worker_started_at,
            cancellation_requested_at
        ";
        
        if ($hasEscrowAmount) {
            $selectFields = str_replace('price,', 'escrow_amount, price,', $selectFields);
        }
        
        $stmt = $conn->prepare("
            SELECT 
                $selectFields
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
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'La tarea ya está completada y pagada. No se puede cancelar.'
            ]);
            $conn->close();
            exit;
        }
        
        // BLOQUEAR si no hay escrow configurado
        if (empty($escrowId)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'No hay escrow configurado para esta tarea. No se puede procesar reembolso.'
            ]);
            $conn->close();
            exit;
        }
        
        // Verificar si ya fue cancelada
        if ($currentStatus === 'cancelled' || $currentStatus === 'rejected') {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Esta tarea ya fue cancelada anteriormente.'
            ]);
            $conn->close();
            exit;
        }
        
        // Si hay tx_hash, significa que el cliente ya firmó y procesó el reembolso
        // Solo actualizar el estado en BD
        if (!empty($txHash)) {
            // Verificar que las columnas existen, si no, crearlas
            $checkColumns = $conn->query("SHOW COLUMNS FROM tasks LIKE 'cancellation_tx_hash'");
            if ($checkColumns === false || $checkColumns->num_rows === 0) {
                $conn->query("ALTER TABLE tasks ADD COLUMN cancellation_tx_hash VARCHAR(255) NULL");
            }
            
            $checkColumns2 = $conn->query("SHOW COLUMNS FROM tasks LIKE 'cancellation_initiated_by'");
            if ($checkColumns2 === false || $checkColumns2->num_rows === 0) {
                $conn->query("ALTER TABLE tasks ADD COLUMN cancellation_initiated_by INT NULL");
            }
            
            $checkColumns3 = $conn->query("SHOW COLUMNS FROM tasks LIKE 'cancellation_reason'");
            if ($checkColumns3 === false || $checkColumns3->num_rows === 0) {
                $conn->query("ALTER TABLE tasks ADD COLUMN cancellation_reason TEXT NULL");
            }
            
            $checkColumns4 = $conn->query("SHOW COLUMNS FROM tasks LIKE 'cancellation_requested_at'");
            if ($checkColumns4 === false || $checkColumns4->num_rows === 0) {
                $conn->query("ALTER TABLE tasks ADD COLUMN cancellation_requested_at DATETIME NULL");
            }
            
            // Actualizar estado de la tarea
            $updateStmt = $conn->prepare("
                UPDATE tasks 
                SET 
                    status = 'cancelled',
                    escrow_status = 'refunded',
                    cancellation_tx_hash = ?,
                    cancellation_initiated_by = ?,
                    cancellation_reason = ?,
                    cancellation_requested_at = NOW()
                WHERE id = ?
            ");
            
            if ($updateStmt === false) {
                throw new Exception('Error al preparar consulta de actualización: ' . $conn->error);
            }
            
            $updateStmt->bind_param("siis", $txHash, $userId, $reason, $taskId);
            
            if (!$updateStmt->execute()) {
                $updateStmt->close();
                throw new Exception('Error al actualizar tarea: ' . $updateStmt->error);
            }
            
            $updateStmt->close();
            
            // Registrar evento en task_progress si la tabla existe
            $checkTable = $conn->query("SHOW TABLES LIKE 'task_progress'");
            if ($checkTable !== false && $checkTable->num_rows > 0) {
                $progressStmt = $conn->prepare("
                    INSERT INTO task_progress (task_id, user_id, progress_type, description, metadata, created_at)
                    VALUES (?, ?, 'cancellation_approved', ?, ?, NOW())
                ");
                
                if ($progressStmt !== false) {
                    $metadata = json_encode([
                        'tx_hash' => $txHash,
                        'reason' => $reason
                    ]);
                    $description = 'Tarea cancelada y reembolso procesado';
                    $progressStmt->bind_param("iiss", $taskId, $userId, $description, $metadata);
                    $progressStmt->execute();
                    $progressStmt->close();
                }
            }
            
            // Calcular monto de reembolso
            $refundAmount = 0;
            if (!empty($task['escrow_amount'])) {
                $refundAmount = floatval($task['escrow_amount']);
            } elseif (!empty($task['price'])) {
                $refundAmount = floatval($task['price']);
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Tarea cancelada exitosamente. Reembolso procesado.',
                'txHash' => $txHash, // camelCase para frontend
                'tx_hash' => $txHash, // snake_case para compatibilidad
                'refundAmount' => $refundAmount, // camelCase para frontend
                'refund_amount' => $refundAmount, // snake_case para compatibilidad
                'status' => 'cancelled'
            ]);
            
            $conn->close();
            exit;
        }
        
        // Si NO hay tx_hash, significa que el cliente está solicitando cancelación
        // Validar que cancelación está permitida
        // (Llamar a la lógica de check_cancellation_allowed.php)
        
        $workerStartedAt = $task['worker_started_at'];
        $hasStarted = !empty($workerStartedAt);
        
        // Verificar entregas del trabajador
        $hasDeliveries = false;
        $checkTable = $conn->query("SHOW TABLES LIKE 'task_progress'");
        if ($checkTable !== false && $checkTable->num_rows > 0 && !empty($task['accepted_applicant_id'])) {
            $deliveryStmt = $conn->prepare("
                SELECT COUNT(*) as count 
                FROM task_progress 
                WHERE task_id = ? 
                AND user_id = ? 
                AND progress_type = 'delivery'
            ");
            if ($deliveryStmt !== false) {
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
        if (!empty($task['accepted_applicant_id'])) {
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
            if ($messageStmt !== false) {
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
        }
        
        // Determinar si cancelación está permitida
        $allowed = false;
        $requiresDispute = false;
        
        if ($hasStarted || $hasDeliveries || $hasMessages) {
            $allowed = false;
            $requiresDispute = true;
        } else {
            $allowed = true;
            $requiresDispute = false;
        }
        
        // Si requiere disputa, rechazar
        if ($requiresDispute) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'No puedes cancelar esta tarea directamente. El trabajador ya ha comenzado. Debes iniciar una disputa.',
                'requires_dispute' => true,
                'worker_protection' => [
                    'has_started' => $hasStarted,
                    'has_deliveries' => $hasDeliveries,
                    'has_messages' => $hasMessages
                ]
            ]);
            $conn->close();
            exit;
        }
        
        // Si está permitido, retornar información para que el frontend procese el reembolso
        // El frontend llamará a Trustless Work para obtener la transacción no firmada
        
        // Calcular monto de reembolso
        // PRIORIDAD 1: Usar escrow_amount si existe (más preciso)
        // PRIORIDAD 2: Usar price si no hay escrow_amount
        $refundAmount = 0;
        if ($hasEscrowAmount && !empty($task['escrow_amount']) && floatval($task['escrow_amount']) > 0) {
            $refundAmount = floatval($task['escrow_amount']);
        } elseif (!empty($task['price']) && floatval($task['price']) > 0) {
            $refundAmount = floatval($task['price']);
        }
        
        // Si aún no hay monto, intentar obtener del escrow de Trustless Work
        // Por ahora, si no hay monto, retornar error
        if ($refundAmount <= 0) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'No se puede determinar el monto de reembolso. El escrow puede no estar fondeado o la información está incompleta.',
                'debug' => [
                    'has_escrow_amount_column' => $hasEscrowAmount,
                    'escrow_amount_value' => $hasEscrowAmount ? ($task['escrow_amount'] ?? 'NULL') : 'N/A',
                    'price_value' => $task['price'] ?? 'NULL',
                    'escrow_id' => $escrowId
                ]
            ]);
            $conn->close();
            exit;
        }
        
        echo json_encode([
            'success' => true,
            'allowed' => true,
            'message' => 'Cancelación permitida. Procede a firmar la transacción de reembolso.',
            'requiresSignature' => true, // camelCase para frontend
            'requires_signature' => true, // snake_case para compatibilidad
            'refundAmount' => $refundAmount, // camelCase para frontend
            'refund_amount' => $refundAmount, // snake_case para compatibilidad
            'escrowId' => $escrowId, // camelCase para frontend
            'escrow_id' => $escrowId, // snake_case para compatibilidad
            'escrowStatus' => $escrowStatus, // camelCase para frontend
            'escrow_status' => $escrowStatus, // snake_case para compatibilidad
            'note' => 'El frontend debe llamar a Trustless Work para obtener la transacción no firmada y procesar el reembolso.'
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
        'message' => 'Método no permitido. Use POST.'
    ]);
    $conn->close();
}
?>

