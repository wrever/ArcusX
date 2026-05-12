<?php
/**
 * Ofertas de tarea dirigidas al usuario autenticado (invitación privada).
 * GET /api/auth/get_private_offers.php
 * Headers: Authorization: Bearer {JWT}
 */

require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('GET, OPTIONS');
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/auth_bearer.php';

arcusx_cors_apply('GET, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

function fix_utf8_mojibake($str) {
    if (!is_string($str) || $str === '') return $str;
    $bytes = @mb_convert_encoding($str, 'ISO-8859-1', 'UTF-8');
    if ($bytes === false) return $str;
    if (!mb_check_encoding($bytes, 'UTF-8')) return $str;
    return $bytes;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
    exit;
}

$userId = arcusx_jwt_user_id();
if ($userId === null) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado'], JSON_UNESCAPED_UNICODE);
    exit;
}

$col = $conn->query("SHOW COLUMNS FROM tasks LIKE 'is_private_invite'");
if (!$col || $col->num_rows === 0) {
    echo json_encode(['success' => true, 'offers' => [], 'message' => 'private_invite_columns_missing'], JSON_UNESCAPED_UNICODE);
    $conn->close();
    exit;
}

$sql = "SELECT
            t.id,
            t.title,
            t.subtitle,
            t.description,
            t.price,
            t.currency,
            t.difficulty,
            t.category,
            t.created_at,
            t.status,
            u.username AS creator_username,
            u.id AS creator_id,
            (SELECT COUNT(*) FROM applications a WHERE a.task_id = t.id AND a.applicant_id = ?) AS my_application_count
        FROM tasks t
        JOIN users u ON t.user_id = u.id
        WHERE t.is_private_invite = 1
          AND t.invited_user_id = ?
          AND (t.accepted_applicant_id IS NULL OR t.accepted_applicant_id = 0)
          AND t.status = 'open'
        ORDER BY t.created_at DESC";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al preparar consulta: ' . $conn->error], JSON_UNESCAPED_UNICODE);
    $conn->close();
    exit;
}

$stmt->bind_param('ii', $userId, $userId);
$stmt->execute();
if (!method_exists($stmt, 'get_result')) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Servidor requiere mysqlnd'], JSON_UNESCAPED_UNICODE);
    $stmt->close();
    $conn->close();
    exit;
}
$result = $stmt->get_result();

$offers = [];
$textKeys = ['title', 'subtitle', 'description', 'category', 'difficulty', 'currency', 'creator_username'];
while ($row = $result->fetch_assoc()) {
    foreach ($textKeys as $k) {
        if (isset($row[$k]) && is_string($row[$k])) {
            $row[$k] = fix_utf8_mojibake($row[$k]);
        }
    }
    $row['my_application_count'] = (int) ($row['my_application_count'] ?? 0);
    $offers[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode(['success' => true, 'offers' => $offers], JSON_UNESCAPED_UNICODE);
