<?php
require_once __DIR__ . '/lib/security_headers.php';
require_once __DIR__ . '/lib/require_autoload.php';
/**
 * complete_task.php
 * Endpoint para completar una tarea (aceptar o rechazar trabajo completado)
 */

// CORS headers - DEBEN IR PRIMERO, ANTES DE CUALQUIER OTRO OUTPUT
$allowed_origins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://arcusx.pro',
    'http://arcusx.pro'
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

// Manejar preflight OPTIONS request PRIMERO
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    }
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 3600");
    header("Content-Length: 0");
    http_response_code(200);
    exit();
}

// Headers CORS para requests normales
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Habilitar logs (pero NO mostrar errores en pantalla para evitar output antes de headers)
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

require_once 'config.php';
require_once 'vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// Definir la clave secreta (debe coincidir con la de login.php y select_proposal.php)
$secret_key = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY"; // !! ASEGÚRATE DE QUE ESTA CLAVE COINCIDA CON LA REAL !!

// Función para obtener el ID del usuario logeado desde el token JWT (reutilizada)
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
        error_log("JWT Error in complete_task.php: " . $e->getMessage());
        return null;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $loggedInUserId = getLoggedInUserId($conn, $secret_key);

    if (is_null($loggedInUserId)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Acceso no autorizado: Token JWT no proporcionado o inválido.']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    
    // Logging para debugging
    error_log("complete_task.php - Datos recibidos: " . json_encode($data));
    error_log("complete_task.php - task_id presente: " . (isset($data['task_id']) ? 'yes' : 'no'));
    error_log("complete_task.php - task_id valor: " . (isset($data['task_id']) ? $data['task_id'] : 'N/A'));

    if (!isset($data['task_id'])) {
        error_log("complete_task.php - Error: task_id no está presente en los datos");
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID de tarea faltante.']);
        exit;
    }
    
    // Convertir a entero y validar
    $taskId = intval($data['task_id']);
    if ($taskId <= 0) {
        error_log("complete_task.php - Error: task_id inválido después de conversión: " . $taskId);
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID de tarea inválido.']);
        exit;
    }
    
    error_log("complete_task.php - taskId validado: " . $taskId);

    // Iniciar una transacción para asegurar la atomicidad de las actualizaciones
    $conn->begin_transaction();

    try {
        // 1. Obtener detalles de la tarea, incluyendo los nuevos campos de aceptación y escrow
        $stmt_get_task = $conn->prepare("SELECT user_id, accepted_applicant_id, status, client_accepted_completion, worker_accepted_completion, escrow_id, escrow_status, escrow_created_at, price FROM tasks WHERE id = ? FOR UPDATE"); // FOR UPDATE para bloqueo de fila
        if ($stmt_get_task === false) { throw new Exception('Error al preparar la consulta de tarea: ' . $conn->error); }
        $stmt_get_task->bind_param("i", $taskId);
        if (!$stmt_get_task->execute()) { throw new Exception('Error al ejecutar la consulta de tarea: ' . $stmt_get_task->error); }
        $result_get_task = $stmt_get_task->get_result();

        if ($result_get_task->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Tarea no encontrada.']);
            $stmt_get_task->close();
            $conn->rollback();
            exit;
        }

        $task_data = $result_get_task->fetch_assoc();
        $stmt_get_task->close();

        $taskCreatorId = (string) $task_data['user_id'];
        $taskAcceptedApplicantId = (string) $task_data['accepted_applicant_id'];
        $currentStatus = $task_data['status'];
        $clientAccepted = $task_data['client_accepted_completion'];
        $workerAccepted = $task_data['worker_accepted_completion'];
        $escrowId = $task_data['escrow_id'] ?? null;
        $escrowStatus = $task_data['escrow_status'] ?? null;
        $escrowCreatedAt = $task_data['escrow_created_at'] ?? null;
        $taskPrice = $task_data['price'] ?? null;
        
        // Verificar si hay acción de rechazo (si viene tx_hash de reembolso)
        $txHash = $data['tx_hash'] ?? null;
        $action = $data['action'] ?? 'accept'; // 'accept' o 'reject'

        // Verificar si la tarea ya está completada
        if ($currentStatus === 'completed') {
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'La tarea ya ha sido marcada como completada.', 'status' => 'completed']);
            $conn->rollback();
            exit;
        }

        // Si es acción de rechazo (solo cliente puede rechazar)
        if ($action === 'reject') {
            if ($loggedInUserId !== $taskCreatorId) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Solo el cliente puede rechazar el trabajo']);
                $conn->rollback();
                exit;
            }
            
            // Actualizar estado a rejected y escrow a refunded
            $stmt_reject = $conn->prepare("UPDATE tasks SET status = 'rejected', escrow_status = 'refunded' WHERE id = ?");
            $stmt_reject->bind_param("i", $taskId);
            $stmt_reject->execute();
            $stmt_reject->close();
            
            $conn->commit();
            echo json_encode([
                'success' => true,
                'message' => 'Trabajo rechazado. Los fondos han sido reembolsados.',
                'status' => 'rejected'
            ]);
            $conn->close();
            exit;
        }

        // Acción de aceptar (completar trabajo)
        $update_field = '';
        $message_to_send = '';

        if ($loggedInUserId === $taskCreatorId) {
            $update_field = 'client_accepted_completion';
            if ($clientAccepted == 1) {
                http_response_code(200);
                echo json_encode(['success' => true, 'message' => 'Ya has confirmado la finalización de esta tarea.', 'status' => $currentStatus, 'client_accepted_completion' => 1, 'worker_accepted_completion' => $workerAccepted]);
                $conn->rollback();
                exit;
            }
            // NUEVA LÓGICA: Cuando el cliente acepta, la tarea se marca como completada automáticamente
            $message_to_send = 'Tarea marcada como completada. Los fondos serán liberados.';
        } elseif ($loggedInUserId === $taskAcceptedApplicantId) {
            $update_field = 'worker_accepted_completion';
            if ($workerAccepted == 1) {
                http_response_code(200);
                echo json_encode(['success' => true, 'message' => 'Ya has confirmado la finalización de esta tarea.', 'status' => $currentStatus, 'client_accepted_completion' => $clientAccepted, 'worker_accepted_completion' => 1]);
                $conn->rollback();
                exit;
            }
            // NUEVA LÓGICA: Cuando el trabajador acepta, solo es una notificación al cliente
            $message_to_send = 'Tu confirmación ha sido registrada. El cliente será notificado.';
        } else {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'No tienes permiso para marcar esta tarea como completada.']);
            $conn->rollback();
            exit;
        }

        // 2. Actualizar el campo de aceptación del usuario actual
        $stmt_update_acceptance = $conn->prepare("UPDATE tasks SET {$update_field} = 1 WHERE id = ?");
        if ($stmt_update_acceptance === false) { throw new Exception('Error al preparar la actualización de aceptación: ' . $conn->error); }
        $stmt_update_acceptance->bind_param("i", $taskId);
        if (!$stmt_update_acceptance->execute()) { throw new Exception('Error al actualizar la aceptación: ' . $stmt_update_acceptance->error); }
        $stmt_update_acceptance->close();

        // 3. Re-obtener los estados de aceptación después de la actualización
        $stmt_recheck_task = $conn->prepare("SELECT client_accepted_completion, worker_accepted_completion FROM tasks WHERE id = ?");
        if ($stmt_recheck_task === false) { throw new Exception('Error al preparar la re-verificación de tarea: ' . $conn->error); }
        $stmt_recheck_task->bind_param("i", $taskId);
        if (!$stmt_recheck_task->execute()) { throw new Exception('Error al ejecutar la re-verificación de tarea: ' . $stmt_recheck_task->error); }
        $result_recheck_task = $stmt_recheck_task->get_result();
        $updated_task_data = $result_recheck_task->fetch_assoc();
        $stmt_recheck_task->close();

        $clientAccepted = $updated_task_data['client_accepted_completion'];
        $workerAccepted = $updated_task_data['worker_accepted_completion'];

        $final_status = $currentStatus;
        
        // NUEVA LÓGICA: Si el cliente aceptó, marcar la tarea como completada inmediatamente
        $shouldMarkAsCompleted = false;
        if ($loggedInUserId === $taskCreatorId && $clientAccepted == 1 && $currentStatus !== 'completed') {
            $shouldMarkAsCompleted = true;
            error_log("✅ Cliente aceptó la tarea. Marcando como completada automáticamente...");
        }

        // Verificar si viene información de que el escrow está completado (fondos liberados)
        $escrowCompleted = isset($data['escrow_completed']) ? (bool)$data['escrow_completed'] : false;
        $txHash = isset($data['tx_hash']) ? trim($data['tx_hash']) : null;
        
        // Si los fondos fueron liberados exitosamente, actualizar escrow_status a 'completed'
        // independientemente de si ambos han aceptado
        if ($escrowCompleted && !empty($txHash)) {
            error_log("✅ Fondos liberados exitosamente. Actualizando escrow_status a 'completed'...");
            error_log("TX Hash: " . $txHash);
            
            $current_datetime = date('Y-m-d H:i:s');
            
            // Verificar si la columna scheduled_deletion_at existe
            $checkColumn = $conn->query("SHOW COLUMNS FROM tasks LIKE 'scheduled_deletion_at'");
            $hasScheduledDeletion = $checkColumn && $checkColumn->num_rows > 0;
            
            // NUEVA LÓGICA: Si el cliente aceptó, también actualizar status a 'completed'
            if ($clientAccepted == 1 && $currentStatus !== 'completed') {
                if ($hasScheduledDeletion) {
                    $stmt_update_escrow = $conn->prepare("UPDATE tasks SET status = 'completed', completed_at = ?, escrow_status = 'completed', escrow_completed_at = NOW(), scheduled_deletion_at = ? WHERE id = ?");
                    if ($stmt_update_escrow === false) { 
                        throw new Exception('Error al preparar la actualización de escrow: ' . $conn->error); 
                    }
                    $scheduledDeletionAt = date('Y-m-d H:i:s', strtotime('+24 hours'));
                    $stmt_update_escrow->bind_param("ssi", $current_datetime, $scheduledDeletionAt, $taskId);
                } else {
                    $stmt_update_escrow = $conn->prepare("UPDATE tasks SET status = 'completed', completed_at = ?, escrow_status = 'completed', escrow_completed_at = NOW() WHERE id = ?");
                    if ($stmt_update_escrow === false) { 
                        throw new Exception('Error al preparar la actualización de escrow: ' . $conn->error); 
                    }
                    $stmt_update_escrow->bind_param("si", $current_datetime, $taskId);
                }
            } else {
                // Solo actualizar escrow_status si los fondos fueron liberados pero no ambos aceptaron
                if ($hasScheduledDeletion) {
                    $stmt_update_escrow = $conn->prepare("UPDATE tasks SET escrow_status = 'completed', escrow_completed_at = NOW(), scheduled_deletion_at = ? WHERE id = ?");
                    if ($stmt_update_escrow === false) { 
                        throw new Exception('Error al preparar la actualización de escrow: ' . $conn->error); 
                    }
                    $scheduledDeletionAt = date('Y-m-d H:i:s', strtotime('+24 hours'));
                    $stmt_update_escrow->bind_param("si", $scheduledDeletionAt, $taskId);
                } else {
                    $stmt_update_escrow = $conn->prepare("UPDATE tasks SET escrow_status = 'completed', escrow_completed_at = NOW() WHERE id = ?");
                    if ($stmt_update_escrow === false) { 
                        throw new Exception('Error al preparar la actualización de escrow: ' . $conn->error); 
                    }
                    $stmt_update_escrow->bind_param("i", $taskId);
                }
            }
            
            if (!$stmt_update_escrow->execute()) { 
                throw new Exception('Error al actualizar escrow_status: ' . $stmt_update_escrow->error); 
            }
            $stmt_update_escrow->close();
            
            // Si la columna scheduled_deletion_at no existe, crearla y actualizar
            if (!$hasScheduledDeletion) {
                $alterTable = "ALTER TABLE tasks ADD COLUMN scheduled_deletion_at DATETIME NULL AFTER escrow_completed_at";
                $conn->query($alterTable);
                $scheduledDeletionAt = date('Y-m-d H:i:s', strtotime('+24 hours'));
                $stmt_update_deletion = $conn->prepare("UPDATE tasks SET scheduled_deletion_at = ? WHERE id = ?");
                $stmt_update_deletion->bind_param("si", $scheduledDeletionAt, $taskId);
                $stmt_update_deletion->execute();
                $stmt_update_deletion->close();
            }
            
            error_log("✅ escrow_status actualizado a 'completed' para la tarea ID: " . $taskId);
            
            // NUEVA LÓGICA: Si el cliente aceptó y se actualizó el status, incrementar contador de tareas completadas
            if ($clientAccepted == 1 && $currentStatus !== 'completed') {
                if ($taskAcceptedApplicantId !== null && $taskAcceptedApplicantId !== '') {
                    $stmt_update_user_count = $conn->prepare("UPDATE users SET completed_tasks_count = completed_tasks_count + 1 WHERE id = ?");
                    if ($stmt_update_user_count === false) { 
                        throw new Exception('Error al preparar la actualización del contador de usuario: ' . $conn->error); 
                    }
                    $stmt_update_user_count->bind_param("i", $taskAcceptedApplicantId);
                    if (!$stmt_update_user_count->execute()) { 
                        throw new Exception('Error al incrementar el contador de tareas completadas del usuario: ' . $stmt_update_user_count->error); 
                    }
                    $stmt_update_user_count->close();
                    error_log("Successfully incremented completed_tasks_count for user ID: " . $taskAcceptedApplicantId);
                }
            }
        }

        // 4. NUEVA LÓGICA: Si el cliente aceptó, marcar la tarea como completada automáticamente
        if ($shouldMarkAsCompleted) {
            $current_datetime = date('Y-m-d H:i:s');
            
            // Calcular fecha de eliminación programada (24 horas después)
            $scheduledDeletionAt = date('Y-m-d H:i:s', strtotime('+24 hours'));
            
            // Actualizar estado de tarea y escrow, y programar eliminación
            // Primero verificar si la columna scheduled_deletion_at existe
            $checkColumn = $conn->query("SHOW COLUMNS FROM tasks LIKE 'scheduled_deletion_at'");
            $hasScheduledDeletion = $checkColumn && $checkColumn->num_rows > 0;
            
            if ($hasScheduledDeletion) {
                $stmt_complete_task = $conn->prepare("UPDATE tasks SET status = 'completed', completed_at = ?, escrow_status = 'completed', escrow_completed_at = NOW(), scheduled_deletion_at = ? WHERE id = ?");
                if ($stmt_complete_task === false) { throw new Exception('Error al preparar la finalización de tarea: ' . $conn->error); }
                $stmt_complete_task->bind_param("ssi", $current_datetime, $scheduledDeletionAt, $taskId);
            } else {
                // Si no existe la columna, solo actualizar los campos existentes
                $stmt_complete_task = $conn->prepare("UPDATE tasks SET status = 'completed', completed_at = ?, escrow_status = 'completed', escrow_completed_at = NOW() WHERE id = ?");
                if ($stmt_complete_task === false) { throw new Exception('Error al preparar la finalización de tarea: ' . $conn->error); }
                $stmt_complete_task->bind_param("si", $current_datetime, $taskId);
            }
            
            if (!$stmt_complete_task->execute()) { throw new Exception('Error al finalizar la tarea: ' . $stmt_complete_task->error); }
            $stmt_complete_task->close();
            
            // Si la columna no existe, crearla
            if (!$hasScheduledDeletion) {
                $alterTable = "ALTER TABLE tasks ADD COLUMN scheduled_deletion_at DATETIME NULL AFTER escrow_completed_at";
                $conn->query($alterTable);
                // Actualizar con la fecha de eliminación
                $stmt_update_deletion = $conn->prepare("UPDATE tasks SET scheduled_deletion_at = ? WHERE id = ?");
                $stmt_update_deletion->bind_param("si", $scheduledDeletionAt, $taskId);
                $stmt_update_deletion->execute();
                $stmt_update_deletion->close();
            }
            
            // Nota: La liberación de fondos se hace desde el frontend con Stellar
            // El backend solo registra que el cliente aceptó

            // LOGGING CRUCIAL:
            error_log("--- complete_task.php DEBUG ---");
            error_log("Task ID: " . $taskId);
            error_log("Task Creator ID (\$taskCreatorId): " . $taskCreatorId);
            error_log("Accepted Applicant ID (\$taskAcceptedApplicantId): " . $taskAcceptedApplicantId);
            error_log("Logged In User ID (\$loggedInUserId): " . $loggedInUserId);
            error_log("Client Accepted: " . $clientAccepted);
            error_log("Worker Accepted: " . $workerAccepted);
            error_log("Current Task Status: " . $currentStatus);
            error_log("Attempting to increment completed_tasks_count for user ID: " . $taskAcceptedApplicantId);

            // Incrementar el contador de tareas completadas para el trabajador asignado
            if ($taskAcceptedApplicantId !== null && $taskAcceptedApplicantId !== '') {
                $stmt_update_user_count = $conn->prepare("UPDATE users SET completed_tasks_count = completed_tasks_count + 1 WHERE id = ?");
                if ($stmt_update_user_count === false) { throw new Exception('Error al preparar la actualización del contador de usuario: ' . $conn->error); }
                $stmt_update_user_count->bind_param("i", $taskAcceptedApplicantId);
                if (!$stmt_update_user_count->execute()) { throw new Exception('Error al incrementar el contador de tareas completadas del usuario: ' . $stmt_update_user_count->error); }
                $stmt_update_user_count->close();
                error_log("Successfully incremented completed_tasks_count for user ID: " . $taskAcceptedApplicantId);
            } else {
                error_log("complete_task.php: No se pudo incrementar el contador de tareas completadas porque accepted_applicant_id es nulo o vacío para la tarea ID: " . $taskId);
            }

            // NOTA: NO eliminamos la tarea aquí porque necesitamos que exista para:
            // 1. Guardar la transacción parcialmente firmada (save_pending_transaction.php)
            // 2. Obtener la transacción pendiente (get_pending_transaction.php)
            // 3. Enviar la transacción completa (submit_complete_transaction.php)
            // La tarea se eliminará después de que los fondos se liberen exitosamente
            // en submit_complete_transaction.php

            $final_status = 'completed';
            $message_to_send = '¡Tarea marcada como completada con éxito! Los fondos serán liberados.';
        }

        // Confirmar la transacción
        $conn->commit();

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => $message_to_send,
            'status' => $final_status,
            'client_accepted_completion' => $clientAccepted,
            'worker_accepted_completion' => $workerAccepted,
            'escrow_id' => $escrowId, // Incluir escrow_id para que el frontend pueda usarlo
            'escrow_status' => $escrowStatus,
            'escrow_created_at' => $escrowCreatedAt
        ]);

    } catch (Exception $e) {
        // Revertir la transacción en caso de error
        $conn->rollback();
        error_log('Error en la transacción complete_task.php: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error interno del servidor.', 'error' => $e->getMessage()]);
    }

    $conn->close();

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}
?>