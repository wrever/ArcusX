<?php
require_once __DIR__ . '/config.php';

function fix_utf8_mojibake($str) {
    if (!is_string($str) || $str === '') return $str;
    $bytes = @mb_convert_encoding($str, 'ISO-8859-1', 'UTF-8');
    if ($bytes === false) return $str;
    if (!mb_check_encoding($bytes, 'UTF-8')) return $str;
    return $bytes;
}

$_cors_origin = (function(){ $o=$_SERVER["HTTP_ORIGIN"]??""; return in_array($o,["http://localhost:5173","http://localhost:5174","https://arcusx.pro","http://arcusx.pro"],true)?$o:"https://arcusx.pro"; })(); header("Access-Control-Allow-Origin: ".$_cors_origin);
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['message' => 'Método no permitido. Solo se permite GET.']);
    exit();
}

$task_id = isset($_GET['task_id']) ? intval($_GET['task_id']) : null;

if (!$task_id) {
    http_response_code(400);
    echo json_encode(['message' => 'ID de tarea requerido.']);
    exit;
}

try {
    // Obtener propuestas de la tarea con información del aplicante
    $stmt = $conn->prepare("
        SELECT 
            a.id,
            a.task_id,
            a.applicant_id,
            a.message,
            a.portfolio_url,
            a.worker_wallet_address,
            a.created_at,
            'pending' as status,
            u.username as applicant_username,
            u.email as applicant_email
        FROM applications a
        JOIN users u ON a.applicant_id = u.id
        WHERE a.task_id = ?
        ORDER BY a.created_at DESC
    ");
    
    $stmt->bind_param("i", $task_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $proposals = [];
    $textKeys = ['message', 'applicant_username'];
    while ($row = $result->fetch_assoc()) {
        foreach ($textKeys as $k) {
            if (isset($row[$k]) && is_string($row[$k])) $row[$k] = fix_utf8_mojibake($row[$k]);
        }
        $proposals[] = $row;
    }
    
    $stmt->close();
    
    http_response_code(200);
    echo json_encode($proposals);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['message' => 'Error al obtener las propuestas: ' . $e->getMessage()]);
}

$conn->close();
?>