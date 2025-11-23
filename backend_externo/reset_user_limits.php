<?php
require_once 'config.php';

// Headers CORS
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Obtener el user_id de los parámetros GET
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;

if (!$user_id) {
    echo json_encode(['error' => 'user_id requerido']);
    exit;
}

// Resetear límites del usuario
$sql = "UPDATE user_task_limits SET 
        tasks_today = 0, 
        tasks_this_week = 0, 
        cooldown_until = NULL,
        updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = $user_id";

if ($conn->query($sql)) {
    echo json_encode([
        'message' => 'Límites reseteados exitosamente',
        'user_id' => $user_id,
        'tasks_today' => 0,
        'tasks_this_week' => 0,
        'cooldown_until' => null
    ]);
} else {
    echo json_encode(['error' => 'Error al resetear límites: ' . $conn->error]);
}

$conn->close();
?>
