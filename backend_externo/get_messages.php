<?php
// get_messages.php
$_cors_origin = (function(){ $o=$_SERVER["HTTP_ORIGIN"]??""; return in_array($o,["http://localhost:5173","http://localhost:5174","https://arcusx.pro","http://arcusx.pro"],true)?$o:"https://arcusx.pro"; })(); header("Access-Control-Allow-Origin: ".$_cors_origin);
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once 'config.php';

function fix_utf8_mojibake($str) {
    if (!is_string($str) || $str === '') return $str;
    $bytes = @mb_convert_encoding($str, 'ISO-8859-1', 'UTF-8');
    if ($bytes === false) return $str;
    if (!mb_check_encoding($bytes, 'UTF-8')) return $str;
    return $bytes;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_GET['task_id'])) {
        http_response_code(400);
        echo json_encode(['message' => 'Falta el ID de la tarea']);
        exit;
    }

    $task_id = intval($_GET['task_id']);
    
    // Obtener mensajes con información del remitente
    $sql = "SELECT m.*, u.username as sender_username 
            FROM messages m 
            JOIN users u ON m.sender_id = u.id 
            WHERE m.task_id = $task_id 
            ORDER BY m.created_at ASC";

    $result = $conn->query($sql);

    if ($result === false) {
        http_response_code(500);
        echo json_encode(['message' => 'Error al obtener mensajes: ' . $conn->error]);
        exit;
    }

    $messages = [];
    while ($row = $result->fetch_assoc()) {
        foreach ($row as $k => $v) {
            if (isset($row[$k]) && is_string($row[$k])) {
                $row[$k] = fix_utf8_mojibake($row[$k]);
            }
        }
        $messages[] = $row;
    }

    http_response_code(200);
    echo json_encode($messages);
} else {
    http_response_code(405);
    echo json_encode(['message' => 'Método no permitido']);
}
?>