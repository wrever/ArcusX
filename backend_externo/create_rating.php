<?php
/**
 * create_rating.php
 * Crear un rating y review para una tarea completada
 * 
 * Parámetros (POST):
 * - task_id: ID de la tarea
 * - rated_user_id: ID del usuario que está siendo calificado
 * - rating: Calificación (1-5)
 * - review: Texto opcional del review
 * 
 * Retorna:
 * - success: boolean
 * - message: string
 */

require_once 'admin_common.php';

header('Content-Type: application/json');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

try {
    // Obtener conexión y usuario
    $conn = getDatabaseConnection();
    $user = getCurrentUser($conn);
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit();
    }
    
    // Obtener datos del POST
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
        exit();
    }
    
    $taskId = isset($data['task_id']) ? (int)$data['task_id'] : 0;
    $ratedUserId = isset($data['rated_user_id']) ? (int)$data['rated_user_id'] : 0;
    $rating = isset($data['rating']) ? (int)$data['rating'] : 0;
    $review = isset($data['review']) ? trim($data['review']) : null;
    $raterId = $user['id'];
    
    // Validaciones
    if ($taskId <= 0) {
        throw new Exception('task_id inválido');
    }
    
    if ($ratedUserId <= 0) {
        throw new Exception('rated_user_id inválido');
    }
    
    if ($rating < 1 || $rating > 5) {
        throw new Exception('rating debe estar entre 1 y 5');
    }
    
    if ($raterId === $ratedUserId) {
        throw new Exception('No puedes calificarte a ti mismo');
    }
    
    // Verificar que la tarea esté completada
    $taskStmt = $conn->prepare("SELECT id, status, escrow_status, user_id, accepted_applicant_id FROM tasks WHERE id = ?");
    $taskStmt->bind_param("i", $taskId);
    $taskStmt->execute();
    $taskResult = $taskStmt->get_result();
    
    if ($taskResult->num_rows === 0) {
        throw new Exception('Tarea no encontrada');
    }
    
    $task = $taskResult->fetch_assoc();
    
    if ($task['status'] !== 'completed' || $task['escrow_status'] !== 'completed') {
        throw new Exception('Solo puedes calificar tareas completadas');
    }
    
    // Verificar que el usuario que califica sea el cliente o el trabajador de la tarea
    $isClient = ($task['user_id'] === $raterId);
    $isWorker = ($task['accepted_applicant_id'] === $raterId);
    
    if (!$isClient && !$isWorker) {
        throw new Exception('Solo el cliente o trabajador de la tarea pueden calificar');
    }
    
    // Verificar que el usuario calificado sea el otro participante
    $expectedRatedId = $isClient ? $task['accepted_applicant_id'] : $task['user_id'];
    if ($ratedUserId !== $expectedRatedId) {
        throw new Exception('Solo puedes calificar al otro participante de la tarea');
    }
    
    // Verificar que no exista un rating previo para esta tarea/usuario
    $checkStmt = $conn->prepare("SELECT id FROM ratings WHERE task_id = ? AND rater_id = ? AND rated_id = ?");
    $checkStmt->bind_param("iii", $taskId, $raterId, $ratedUserId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows > 0) {
        throw new Exception('Ya has calificado a este usuario para esta tarea');
    }
    
    // Insertar el rating
    $insertStmt = $conn->prepare("INSERT INTO ratings (task_id, rater_id, rated_id, rating, review) VALUES (?, ?, ?, ?, ?)");
    $insertStmt->bind_param("iiiis", $taskId, $raterId, $ratedUserId, $rating, $review);
    
    if (!$insertStmt->execute()) {
        throw new Exception('Error al crear rating: ' . $conn->error);
    }
    
    // Actualizar average_rating y total_ratings del usuario calificado
    // Calcular nuevo promedio
    $avgStmt = $conn->prepare("
        SELECT AVG(rating) as avg_rating, COUNT(*) as total 
        FROM ratings 
        WHERE rated_id = ?
    ");
    $avgStmt->bind_param("i", $ratedUserId);
    $avgStmt->execute();
    $avgResult = $avgStmt->get_result();
    $avgData = $avgResult->fetch_assoc();
    
    $newAverage = round((float)$avgData['avg_rating'], 2);
    $newTotal = (int)$avgData['total'];
    
    // Actualizar tabla users
    $updateStmt = $conn->prepare("UPDATE users SET average_rating = ?, total_ratings = ? WHERE id = ?");
    $updateStmt->bind_param("dii", $newAverage, $newTotal, $ratedUserId);
    $updateStmt->execute();
    
    echo json_encode([
        'success' => true,
        'message' => 'Rating creado exitosamente',
        'rating_id' => $insertStmt->insert_id
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

