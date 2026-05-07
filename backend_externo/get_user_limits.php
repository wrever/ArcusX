<?php
header('Content-Type: application/json; charset=UTF-8');
$_cors_origin = (function(){ $o=$_SERVER["HTTP_ORIGIN"]??""; return in_array($o,["http://localhost:5173","http://localhost:5174","https://arcusx.pro","http://arcusx.pro"],true)?$o:"https://arcusx.pro"; })(); header('Access-Control-Allow-Origin: '.$_cors_origin);
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

try {
    require_once __DIR__ . '/config.php';
    if (!isset($conn)) {
        throw new Exception('Error de conexión a la base de datos');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de configuración del servidor.']);
    exit;
}

$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
if (!$user_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'user_id es requerido']);
    exit;
}

try {
    $check_user = $conn->query("SELECT id FROM users WHERE id = " . intval($user_id));
    if ($check_user === false) {
        throw new Exception('Error al verificar usuario: ' . $conn->error);
    }
    if ($check_user->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Usuario no encontrado.']);
        $conn->close();
        exit;
    }

    $today = date('Y-m-d');
    $week_start = date('Y-m-d', strtotime('monday this week'));

    $today_result = $conn->query("SELECT COUNT(*) as count FROM tasks WHERE user_id = " . intval($user_id) . " AND DATE(created_at) = '" . $conn->real_escape_string($today) . "'");
    if ($today_result === false) {
        throw new Exception('Error al contar tareas: ' . $conn->error);
    }
    $tasks_today = (int) $today_result->fetch_assoc()['count'];

    $week_result = $conn->query("SELECT COUNT(*) as count FROM tasks WHERE user_id = " . intval($user_id) . " AND DATE(created_at) >= '" . $conn->real_escape_string($week_start) . "'");
    if ($week_result === false) {
        throw new Exception('Error al contar tareas: ' . $conn->error);
    }
    $tasks_this_week = (int) $week_result->fetch_assoc()['count'];

    $limits = ['cooldown_until' => null];
    $limits_result = @$conn->query("SELECT * FROM user_task_limits WHERE user_id = " . intval($user_id) . " ORDER BY updated_at DESC LIMIT 1");
    if ($limits_result && $limits_result->num_rows > 0) {
        $limits = $limits_result->fetch_assoc();
    }

    $can_create = true;
    $cooldown_remaining = 0;
    if (!empty($limits['cooldown_until'])) {
        $cooldown_until = strtotime($limits['cooldown_until']);
        if ($cooldown_until && time() < $cooldown_until) {
            $can_create = false;
            $cooldown_remaining = $cooldown_until - time();
        }
    }
    $can_create = $can_create && $tasks_today < 5 && $tasks_this_week < 20;

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'can_create' => $can_create,
        'cooldown_remaining' => $cooldown_remaining,
        'tasks_today' => $tasks_today,
        'tasks_this_week' => $tasks_this_week,
        'next_task_time' => $can_create ? 'Ahora' : (!empty($limits['cooldown_until']) ? $limits['cooldown_until'] : 'Ahora')
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('get_user_limits.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al obtener límites.']);
}
if (isset($conn)) $conn->close();
?>
