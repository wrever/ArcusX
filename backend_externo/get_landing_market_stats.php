<?php
/**
 * get_landing_market_stats.php
 * Agregados públicos desde MySQL para la landing (sin JWT), cuando el front
 * no tiene Supabase. Con Supabase, el Hero usa RPCs + `arcusx_tasks_landing_mirror`
 * (open_tasks / volumen) y OAuth para usuarios; este endpoint sigue siendo el respaldo.
 */
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('GET, OPTIONS');
ob_start();

arcusx_cors_apply('GET, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
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
    $r = $conn->query("SELECT COUNT(*) as total FROM tasks WHERE status = 'open' AND (accepted_applicant_id IS NULL OR accepted_applicant_id = 0)");
    $open_tasks = $r && $r->num_rows ? (int)$r->fetch_assoc()['total'] : 0;

    $r = $conn->query("SELECT COUNT(*) as total FROM users");
    $total_users = $r && $r->num_rows ? (int)$r->fetch_assoc()['total'] : 0;

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
    error_log('get_landing_market_stats.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al obtener estadísticas']);
}
$conn->close();
