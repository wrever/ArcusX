<?php
/**
 * Script para eliminar tareas programadas después de 24 horas
 * Este script debe ejecutarse periódicamente (cron job) o llamarse desde el frontend
 * 
 * Elimina tareas que:
 * - Tienen status = 'completed'
 * - Tienen escrow_status = 'completed'
 * - Tienen scheduled_deletion_at <= NOW()
 */

require_once 'config.php';

// Función para obtener el ID del usuario logeado (opcional, para logging)
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
        require_once 'vendor/autoload.php';
        use Firebase\JWT\JWT;
        use Firebase\JWT\Key;
        
        $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));
        if (isset($decoded->data->id)) {
            return (string) $decoded->data->id;
        }
    } catch (Exception $e) {
        return null;
    }
    
    return null;
}

// Verificar si es una petición autorizada (opcional, puede ejecutarse sin autenticación si es cron)
$secret_key = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY";
$loggedInUserId = getLoggedInUserId($conn, $secret_key);

// Si no hay usuario logueado, verificar si es una petición de cron (puede tener un token especial)
$isCronRequest = isset($_GET['cron_token']) && $_GET['cron_token'] === 'arcusx_scheduled_deletion_2025';

if (!$loggedInUserId && !$isCronRequest) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    // Verificar si la columna scheduled_deletion_at existe
    $checkColumn = $conn->query("SHOW COLUMNS FROM tasks LIKE 'scheduled_deletion_at'");
    $hasScheduledDeletion = $checkColumn && $checkColumn->num_rows > 0;
    
    if (!$hasScheduledDeletion) {
        // Crear la columna si no existe
        $alterTable = "ALTER TABLE tasks ADD COLUMN scheduled_deletion_at DATETIME NULL AFTER escrow_completed_at";
        $conn->query($alterTable);
    }
    
    // Buscar tareas que deben ser eliminadas
    // Condiciones:
    // 1. status = 'completed'
    // 2. escrow_status = 'completed'
    // 3. scheduled_deletion_at <= NOW()
    $query = "
        SELECT id, title, escrow_id, scheduled_deletion_at, escrow_completed_at
        FROM tasks 
        WHERE status = 'completed' 
        AND escrow_status = 'completed'
        AND scheduled_deletion_at IS NOT NULL
        AND scheduled_deletion_at <= NOW()
    ";
    
    $result = $conn->query($query);
    
    if ($result === false) {
        throw new Exception('Error al consultar tareas programadas: ' . $conn->error);
    }
    
    $tasksToDelete = [];
    while ($row = $result->fetch_assoc()) {
        $tasksToDelete[] = $row;
    }
    
    $deletedCount = 0;
    $errors = [];
    
    foreach ($tasksToDelete as $task) {
        $taskId = $task['id'];
        
        try {
            // Eliminar mensajes asociados
            $stmt_delete_messages = $conn->prepare("DELETE FROM messages WHERE task_id = ?");
            if ($stmt_delete_messages) {
                $stmt_delete_messages->bind_param("i", $taskId);
                $stmt_delete_messages->execute();
                $stmt_delete_messages->close();
            }
            
            // Eliminar aplicaciones asociadas
            $stmt_delete_applications = $conn->prepare("DELETE FROM applications WHERE task_id = ?");
            if ($stmt_delete_applications) {
                $stmt_delete_applications->bind_param("i", $taskId);
                $stmt_delete_applications->execute();
                $stmt_delete_applications->close();
            }
            
            // Eliminar la tarea
            $stmt_delete_task = $conn->prepare("DELETE FROM tasks WHERE id = ?");
            if ($stmt_delete_task) {
                $stmt_delete_task->bind_param("i", $taskId);
                $stmt_delete_task->execute();
                $stmt_delete_task->close();
                $deletedCount++;
                
                error_log("✅ Tarea eliminada automáticamente: ID {$taskId}, Título: {$task['title']}");
            } else {
                $errors[] = "Error al eliminar tarea ID {$taskId}: " . $conn->error;
            }
        } catch (Exception $e) {
            $errors[] = "Error al eliminar tarea ID {$taskId}: " . $e->getMessage();
            error_log("❌ Error al eliminar tarea ID {$taskId}: " . $e->getMessage());
        }
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => "Proceso completado. {$deletedCount} tarea(s) eliminada(s).",
        'deleted_count' => $deletedCount,
        'tasks_found' => count($tasksToDelete),
        'errors' => $errors
    ]);
    
} catch (Exception $e) {
    error_log('Error en delete_scheduled_tasks.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al procesar eliminación de tareas',
        'error' => $e->getMessage()
    ]);
}

$conn->close();
?>

