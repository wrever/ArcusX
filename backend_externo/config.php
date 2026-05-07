<?php

$db_password = getenv('ARCUSX_DB_PASSWORD');
$jwt_secret  = getenv('ARCUSX_JWT_SECRET');

if ($db_password === false || $db_password === '') {
    http_response_code(500);
    echo json_encode(['message' => 'Error de configuración del servidor: ARCUSX_DB_PASSWORD no definida.']);
    exit;
}
if ($jwt_secret === false || $jwt_secret === '') {
    http_response_code(500);
    echo json_encode(['message' => 'Error de configuración del servidor: ARCUSX_JWT_SECRET no definida.']);
    exit;
}

$db_config = [
    'host'     => 'localhost',
    'user'     => 'arcusxon_owner',
    'password' => $db_password,
    'database' => 'arcusxon_users'
];

// Definir constantes para compatibilidad con get_task_details.php
define('DB_HOST', $db_config['host']);
define('DB_USER', $db_config['user']);
define('DB_PASS', $db_config['password']);
define('DB_NAME', $db_config['database']);

$conn = new mysqli($db_config['host'], $db_config['user'], $db_config['password'], $db_config['database']);

if ($conn->connect_error) {
    throw new Exception('Error de conexión a la base de datos: ' . $conn->connect_error);
}

// PHP 8.1: charset UTF-8 para tildes y ñ correctos.
$conn->set_charset('utf8mb4');
