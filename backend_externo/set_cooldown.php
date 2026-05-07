<?php
require_once 'config.php';

// Headers CORS
$_cors_origin = (function(){ $o=$_SERVER["HTTP_ORIGIN"]??""; return in_array($o,["http://localhost:5173","http://localhost:5174","https://arcusx.pro","http://arcusx.pro"],true)?$o:"https://arcusx.pro"; })(); header("Access-Control-Allow-Origin: ".$_cors_origin);
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Solo permitir POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

// Obtener datos JSON
$data = json_decode(file_get_contents('php://input'), true);

// Validar parámetros
if (!isset($data['user_id']) || !isset($data['cooldown_seconds'])) {
    http_response_code(400);
    echo json_encode(['error' => 'user_id y cooldown_seconds son requeridos']);
    exit;
}

$user_id = intval($data['user_id']);
$cooldown_seconds = intval($data['cooldown_seconds']);

// Validar rango de cooldown (30 segundos a 2 horas)
if ($cooldown_seconds < 30 || $cooldown_seconds > 7200) {
    http_response_code(400);
    echo json_encode(['error' => 'cooldown_seconds debe estar entre 30 y 7200 segundos']);
    exit;
}

// Calcular fecha de cooldown
$cooldown_until = date('Y-m-d H:i:s', time() + $cooldown_seconds);

// Actualizar cooldown en la base de datos
$sql = "UPDATE user_task_limits SET 
        cooldown_until = ?,
        updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("si", $cooldown_until, $user_id);

if ($stmt->execute()) {
    echo json_encode([
        'message' => 'Cooldown configurado exitosamente',
        'user_id' => $user_id,
        'cooldown_seconds' => $cooldown_seconds,
        'cooldown_until' => $cooldown_until,
        'cooldown_remaining' => $cooldown_seconds
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error al configurar cooldown: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
