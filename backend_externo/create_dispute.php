<?php
/**
 * Endpoint para crear una disputa
 * POST /api/auth/create_dispute.php
 * Headers: Authorization: Bearer {JWT_TOKEN}
 * Body: { "task_id": 123, "reason": "Razón de la disputa..." }
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
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
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
    
    // También verificar $_SERVER por si getallheaders() no funciona
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
            error_log("JWT Error en create_dispute.php: " . $e->getMessage());
            return null;
        }
    }
    return null;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
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
    
    // Obtener datos del body
    $raw_data = file_get_contents('php://input');
    $data = json_decode($raw_data, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Error al decodificar JSON: ' . json_last_error_msg()
        ]);
        $conn->close();
        exit;
    }
    
    // Validar campos requeridos
    if (!isset($data['task_id']) || !isset($data['reason'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Faltan campos requeridos: task_id y reason son obligatorios.'
        ]);
        $conn->close();
        exit;
    }
    
    $taskId = (int)$data['task_id'];
    $reason = trim($data['reason']);
    
    if ($taskId <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID de tarea inválido.'
        ]);
        $conn->close();
        exit;
    }
    
    if (empty($reason) || strlen($reason) < 10) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'La razón de la disputa debe tener al menos 10 caracteres.'
        ]);
        $conn->close();
        exit;
    }
    
    // Verificar que la tarea existe
    $taskStmt = $conn->prepare("SELECT id, user_id, accepted_applicant_id, status, escrow_id, escrow_status FROM tasks WHERE id = ?");
    if ($taskStmt === false) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al preparar consulta: ' . $conn->error
        ]);
        $conn->close();
        exit;
    }
    
    $taskStmt->bind_param("i", $taskId);
    $taskStmt->execute();
    $taskResult = $taskStmt->get_result();
    
    if ($taskResult->num_rows === 0) {
        $taskStmt->close();
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Tarea no encontrada.'
        ]);
        $conn->close();
        exit;
    }
    
    $task = $taskResult->fetch_assoc();
    $taskStmt->close();
    
    // Verificar que el usuario es el cliente o el trabajador asignado
    $isClient = (int)$task['user_id'] === $userId;
    $isWorker = !empty($task['accepted_applicant_id']) && (int)$task['accepted_applicant_id'] === $userId;
    
    if (!$isClient && !$isWorker) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'No tienes permiso para crear una disputa para esta tarea. Solo el cliente o el trabajador asignado pueden crear disputas.'
        ]);
        $conn->close();
        exit;
    }
    
    // Verificar que hay un escrow configurado
    if (empty($task['escrow_id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'No se puede crear una disputa para una tarea sin escrow configurado.'
        ]);
        $conn->close();
        exit;
    }
    
    // Permitir disputas si el escrow está activo O completado (para casos de error al retirar fondos)
    if ($task['escrow_status'] !== 'active' && $task['escrow_status'] !== 'completed') {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'No se puede crear una disputa. El escrow debe estar activo o completado. Estado actual: ' . $task['escrow_status']
        ]);
        $conn->close();
        exit;
    }
    
    // Verificar que la tarea está en un estado válido para disputar
    // Permitir disputas en estados: assigned, in_progress, y también completed si el escrow está completado (caso de error)
    $validStatuses = ['assigned', 'in_progress'];
    $invalidStatuses = ['cancelled', 'rejected', 'disputed'];
    
    // Si el escrow está completado, también permitir disputas aunque el status sea 'completed' (caso de error al retirar fondos)
    if ($task['escrow_status'] === 'completed' && $task['status'] === 'completed') {
        // Permitir disputa - puede ser un caso de error al retirar fondos donde el escrow se marcó como completado pero hubo problemas
    } elseif (in_array($task['status'], $invalidStatuses)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'No se puede crear una disputa para una tarea con estado: ' . $task['status'] . '.'
        ]);
        $conn->close();
        exit;
    } elseif (!in_array($task['status'], $validStatuses) && !($task['escrow_status'] === 'completed' && $task['status'] === 'completed')) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'No se puede crear una disputa para una tarea con estado: ' . $task['status'] . '. Solo se pueden disputar tareas en progreso, asignadas, o completadas con escrow completado (caso de error).'
        ]);
        $conn->close();
        exit;
    }
    
    // Verificar que no existe una disputa pendiente para esta tarea
    $existingDisputeStmt = $conn->prepare("SELECT id, status FROM disputes WHERE task_id = ? AND status = 'pending'");
    if ($existingDisputeStmt === false) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al verificar disputas existentes: ' . $conn->error
        ]);
        $conn->close();
        exit;
    }
    
    $existingDisputeStmt->bind_param("i", $taskId);
    $existingDisputeStmt->execute();
    $existingResult = $existingDisputeStmt->get_result();
    
    if ($existingResult->num_rows > 0) {
        $existingDisputeStmt->close();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Ya existe una disputa pendiente para esta tarea.'
        ]);
        $conn->close();
        exit;
    }
    
    $existingDisputeStmt->close();
    
    // Crear la disputa
    $createStmt = $conn->prepare("INSERT INTO disputes (task_id, created_by, reason, status) VALUES (?, ?, ?, 'pending')");
    if ($createStmt === false) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al preparar consulta de inserción: ' . $conn->error
        ]);
        $conn->close();
        exit;
    }
    
    $createStmt->bind_param("iis", $taskId, $userId, $reason);
    
    if (!$createStmt->execute()) {
        $createStmt->close();
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al crear la disputa: ' . $createStmt->error
        ]);
        $conn->close();
        exit;
    }
    
    $disputeId = $conn->insert_id;
    $createStmt->close();
    
    // Actualizar el estado de la tarea a 'disputed'
    $updateTaskStmt = $conn->prepare("UPDATE tasks SET status = 'disputed' WHERE id = ?");
    if ($updateTaskStmt === false) {
        error_log("Error al actualizar estado de tarea a 'disputed': " . $conn->error);
        // No fallar la creación de la disputa si esto falla, solo loguear
    } else {
        $updateTaskStmt->bind_param("i", $taskId);
        $updateTaskStmt->execute();
        $updateTaskStmt->close();
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Disputa creada exitosamente.',
        'dispute_id' => $disputeId
    ]);
    
    $conn->close();
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido. Use POST.'
    ]);
}
?>

