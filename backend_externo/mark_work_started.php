<?php
/**
 * mark_work_started.php
 * Endpoint para que el trabajador marque que comenzó a trabajar
 * POST /api/auth/mark_work_started.php
 * Headers: Authorization: Bearer {JWT_TOKEN}
 * Body: { "task_id": 123 }
 */

require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('POST, OPTIONS');
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
require_once __DIR__ . '/auth_bearer.php';

arcusx_cors_apply('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');


if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $userId = arcusx_jwt_user_id();

        if ($userId === null) {
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
        
        if ($taskId <= 0) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'task_id inválido.'
            ]);
            $conn->close();
            exit;
        }
        
        // Verificar que la tarea existe y obtener información
        $stmt = $conn->prepare("
            SELECT id, user_id, accepted_applicant_id, status, worker_started_at
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
        
        // Verificar que el usuario es el trabajador asignado
        if (empty($task['accepted_applicant_id']) || (int)$task['accepted_applicant_id'] !== $userId) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'No tienes permiso para marcar esta tarea. Solo el trabajador asignado puede marcar que comenzó.'
            ]);
            $conn->close();
            exit;
        }
        
        // Verificar si ya fue marcado
        if (!empty($task['worker_started_at'])) {
            echo json_encode([
                'success' => true,
                'message' => 'Ya habías marcado que comenzaste a trabajar.',
                'already_marked' => true,
                'started_at' => $task['worker_started_at']
            ]);
            $conn->close();
            exit;
        }
        
        // Verificar si la columna worker_started_at existe, si no, crearla
        $checkColumn = $conn->query("SHOW COLUMNS FROM tasks LIKE 'worker_started_at'");
        if ($checkColumn === false || $checkColumn->num_rows === 0) {
            $alterStmt = $conn->query("
                ALTER TABLE tasks 
                ADD COLUMN worker_started_at DATETIME NULL 
                COMMENT 'Timestamp cuando trabajador marcó que comenzó'
            ");
            if ($alterStmt === false) {
                throw new Exception('Error al agregar columna worker_started_at: ' . $conn->error);
            }
        }
        
        // Actualizar worker_started_at
        $updateStmt = $conn->prepare("
            UPDATE tasks 
            SET worker_started_at = NOW() 
            WHERE id = ?
        ");
        
        if ($updateStmt === false) {
            throw new Exception('Error al preparar consulta de actualización: ' . $conn->error);
        }
        
        $updateStmt->bind_param("i", $taskId);
        
        if (!$updateStmt->execute()) {
            $updateStmt->close();
            throw new Exception('Error al actualizar worker_started_at: ' . $updateStmt->error);
        }
        
        $updateStmt->close();
        
        // Registrar evento en task_progress si la tabla existe
        $checkTable = $conn->query("SHOW TABLES LIKE 'task_progress'");
        if ($checkTable !== false && $checkTable->num_rows > 0) {
            $progressStmt = $conn->prepare("
                INSERT INTO task_progress (task_id, user_id, progress_type, description, created_at)
                VALUES (?, ?, 'started', 'Trabajador marcó que comenzó a trabajar', NOW())
            ");
            
            if ($progressStmt !== false) {
                $progressStmt->bind_param("ii", $taskId, $userId);
                $progressStmt->execute();
                $progressStmt->close();
            }
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Has marcado que comenzaste a trabajar. Esto protege tu trabajo de cancelaciones automáticas.',
            'started_at' => date('Y-m-d H:i:s')
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

