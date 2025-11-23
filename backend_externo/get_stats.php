<?php
require_once 'config.php';

// Asegurarse de que la solicitud es GET
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Obtener el user_id de los parámetros GET
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
    
    if (!$user_id) {
        http_response_code(400);
        echo json_encode(['message' => 'user_id es requerido']);
        exit;
    }

    // Contar tareas de hoy
    $today = date('Y-m-d');
    $today_result = $conn->query("SELECT COUNT(*) as count FROM tasks WHERE user_id = $user_id AND DATE(created_at) = '$today'");
    $tasks_today = $today_result->fetch_assoc()['count'];
    
    // Contar tareas de esta semana
    $week_start = date('Y-m-d', strtotime('monday this week'));
    $week_result = $conn->query("SELECT COUNT(*) as count FROM tasks WHERE user_id = $user_id AND DATE(created_at) >= '$week_start'");
    $tasks_this_week = $week_result->fetch_assoc()['count'];
    
    // Devolver solo los números
    echo json_encode([
        'tasks_today' => $tasks_today,
        'tasks_this_week' => $tasks_this_week
    ]);

    $conn->close();

} else {
    http_response_code(405);
    echo json_encode(['message' => 'Método no permitido']);
}
?>
