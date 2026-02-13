<?php
/**
 * get_public_stats.php
 * Estadísticas públicas para la landing (sin autenticación).
 * Devuelve: open_tasks, total_users, total_volume_usdc (redondeado).
 */
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');
ob_start();

$allowed_origins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://arcusx.pro',
    'http://arcusx.pro'
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    while (ob_get_level() > 0) ob_end_clean();
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    }
    header("Access-Control-Allow-Methods: GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 3600");
    http_response_code(200);
    exit();
}

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");
ob_end_clean();

try {
    require_once __DIR__ . '/config.php';
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de conexión']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

try {
    // Tareas disponibles (open, sin trabajador asignado)
    $r = $conn->query("SELECT COUNT(*) as total FROM tasks WHERE status = 'open' AND (accepted_applicant_id IS NULL OR accepted_applicant_id = 0)");
    $open_tasks = $r && $r->num_rows ? (int)$r->fetch_assoc()['total'] : 0;

    // Total usuarios
    $r = $conn->query("SELECT COUNT(*) as total FROM users");
    $total_users = $r && $r->num_rows ? (int)$r->fetch_assoc()['total'] : 0;

    // Volumen total pagado (suma de price de tareas completadas) — redondeado
    $r = $conn->query("
        SELECT COALESCE(SUM(CAST(price AS DECIMAL(18,2))), 0) as total
        FROM tasks
        WHERE status = 'completed' AND escrow_status = 'completed'
    ");
    $total_volume_usdc = $r && $r->num_rows ? round((float)$r->fetch_assoc()['total'], 0) : 0;

    echo json_encode([
        'success' => true,
        'open_tasks' => $open_tasks,
        'total_users' => $total_users,
        'total_volume_usdc' => $total_volume_usdc,
    ]);
} catch (Exception $e) {
    error_log('get_public_stats.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al obtener estadísticas']);
}
$conn->close();
