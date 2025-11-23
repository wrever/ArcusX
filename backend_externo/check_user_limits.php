<?php
require_once 'config.php'; // Incluye la configuración de la base de datos

// Asegurarse de que la solicitud es GET
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Obtener el user_id de los parámetros GET
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
    
    if (!$user_id) {
        http_response_code(400); // Bad Request
        echo json_encode(['message' => 'user_id es requerido']);
        exit;
    }

    // Opcional: Verificar si el usuario existe
    $check_user = $conn->query("SELECT id FROM users WHERE id = $user_id");
    if ($check_user->num_rows === 0) {
        http_response_code(404); // Not Found
        echo json_encode(['message' => 'Usuario no encontrado.']);
        exit;
    }

    // Contar tareas reales del usuario
    $today = date('Y-m-d');
    $week_start = date('Y-m-d', strtotime('monday this week'));
    
    // Contar tareas de hoy
    $today_result = $conn->query("SELECT COUNT(*) as count FROM tasks WHERE user_id = $user_id AND DATE(created_at) = '$today'");
    $tasks_today = $today_result->fetch_assoc()['count'];
    
    // Contar tareas de esta semana
    $week_result = $conn->query("SELECT COUNT(*) as count FROM tasks WHERE user_id = $user_id AND DATE(created_at) >= '$week_start'");
    $tasks_this_week = $week_result->fetch_assoc()['count'];
    
    // Devolver solo los números
    echo json_encode([
        'tasks_today' => $tasks_today,
        'tasks_this_week' => $tasks_this_week
    ]);

    // Cerrar la conexión a la base de datos
    $conn->close();

} else {
    // Si la solicitud no es GET, devolver método no permitido
    http_response_code(405); // Method Not Allowed
    echo json_encode(['message' => 'Método no permitido']);
}
?>