<?php
/**
 * DEPRECATED: Este endpoint ya no se usa.
 * El sistema ahora usa exclusivamente Trustless Work para manejar escrows.
 * Trustless Work no usa secret keys - usa contract IDs.
 * 
 * Este archivo se mantiene solo para referencia histórica.
 * 
 * @deprecated Desde la migración a Trustless Work
 */

$_cors_origin = (function(){ $o=$_SERVER["HTTP_ORIGIN"]??""; return in_array($o,["http://localhost:5173","http://localhost:5174","https://arcusx.pro","http://arcusx.pro"],true)?$o:"https://arcusx.pro"; })(); header("Access-Control-Allow-Origin: ".$_cors_origin);
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';
$autoload_path = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoload_path)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Error en el servidor: dependencias no encontradas.']);
    exit;
}
require_once $autoload_path;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$secret_key = $jwt_secret;

function getLoggedInUserId($conn, $secret_key) {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    if (!isset($headers['Authorization'])) {
        return null;
    }

    $authHeader = $headers['Authorization'];
    if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        return null;
    }

    $jwt = $matches[1];

    try {
        $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));
        if (isset($decoded->data->id)) {
            return (string) $decoded->data->id;
        }
        return null;
    } catch (Exception $e) {
        error_log("JWT Error in save_escrow_secret.php: " . $e->getMessage());
        return null;
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$loggedInUserId = getLoggedInUserId($conn, $secret_key);
if (is_null($loggedInUserId)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Acceso no autorizado']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!isset($data['task_id']) || !is_numeric($data['task_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'task_id requerido']);
    exit;
}
if (!isset($data['escrow_secret']) || empty($data['escrow_secret'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'escrow_secret requerido']);
    exit;
}

// Este endpoint está deprecado - Trustless Work no usa secret keys
http_response_code(410); // Gone
echo json_encode([
    'success' => false,
    'message' => 'Este endpoint está deprecado. El sistema ahora usa exclusivamente Trustless Work, que no requiere secret keys.'
]);
$conn->close();
?>

