<?php
// config.php - NO envía headers CORS ni maneja OPTIONS
// Los headers CORS los maneja .htaccess
// OPTIONS lo maneja cada archivo PHP individualmente

$db_config = [
    'host' => 'localhost',
    'user' => 'arcusxon_owner',
    'password' => 'Brn08a33!',
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

// Configuración JWT
$jwt_secret = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY"; // Cambiar por una clave segura

// NOTA: La clase JWT simulada fue removida - ahora se usa Firebase\JWT\JWT de la librería real
// Si algún archivo antiguo necesita la clase simulada, debe actualizarse para usar Firebase\JWT\JWT
?>