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
    
    // Obtener la última tarea creada
    $last_task_result = $conn->query("SELECT created_at FROM tasks WHERE user_id = $user_id ORDER BY created_at DESC LIMIT 1");
    $last_task = $last_task_result->fetch_assoc();
    
    // Obtener límites del usuario (para cooldown)
    $limits_result = $conn->query("SELECT * FROM user_task_limits WHERE user_id = $user_id ORDER BY updated_at DESC LIMIT 1");
    $limits = $limits_result->fetch_assoc();
    
    if (!$limits) {
        // Usuario nuevo, crear registro
        $conn->query("INSERT INTO user_task_limits (user_id, last_task_created, tasks_today, tasks_this_week) VALUES ($user_id, NOW(), 0, 0)");
        $limits = ['cooldown_until' => null];
    }

    // Verificar cooldown
    $can_create = true;
    $cooldown_remaining = 0;

    if ($limits['cooldown_until']) {
        $cooldown_until = strtotime($limits['cooldown_until']);
        if (time() < $cooldown_until) {
            $can_create = false;
            $cooldown_remaining = $cooldown_until - time();
        }
    }

    // Verificar límites diarios/semanales
    $can_create = $can_create && $tasks_today < 5 && $tasks_this_week < 20;

    // Éxito: devolver los límites del usuario
    http_response_code(200); // OK
    echo json_encode([
        'can_create' => $can_create,
        'cooldown_remaining' => $cooldown_remaining,
        'tasks_today' => $tasks_today,
        'tasks_this_week' => $tasks_this_week,
        'next_task_time' => $can_create ? 'Ahora' : ($limits['cooldown_until'] ? $limits['cooldown_until'] : 'Ahora')
    ]);

    // Cerrar la conexión a la base de datos
    $conn->close();

} else {
    // Si la solicitud no es GET, devolver método no permitido
    http_response_code(405); // Method Not Allowed
    echo json_encode(['message' => 'Método no permitido']);
}
?>
