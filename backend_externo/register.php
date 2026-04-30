<?php
/**
 * register.php
 * Endpoint para registro de nuevos usuarios
 */

// Deshabilitar display_errors para evitar output antes de headers
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

// Iniciar output buffering para capturar cualquier output inesperado
ob_start();

// CORS headers - DEBEN IR PRIMERO, ANTES DE CUALQUIER OTRO OUTPUT
$allowed_origins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://arcusx.pro',
    'http://arcusx.pro'
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

// Manejar preflight OPTIONS request PRIMERO
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Limpiar cualquier output previo
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    }
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 3600");
    http_response_code(200);
    exit();
}

// Headers CORS para requests normales
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Limpiar buffer antes de require
ob_end_clean();

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $username = trim($data['username'] ?? '');
    $email    = trim($data['email'] ?? '');
    $password = password_hash($data['password'] ?? '', PASSWORD_DEFAULT);

    // Verificar si el email ya existe
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $emailCheck = $stmt->get_result();
    $stmt->close();
    if ($emailCheck->num_rows > 0) {
        http_response_code(400);
        echo json_encode(['message' => 'El email ya está registrado']);
        exit;
    }

    // Insertar nuevo usuario
    $stmt = $conn->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $username, $email, $password);
    if ($stmt->execute()) {
        $stmt->close();
        echo json_encode(['message' => 'Usuario registrado exitosamente']);
    } else {
        $stmt->close();
        http_response_code(500);
        echo json_encode(['message' => 'Error al registrar usuario']);
    }
} else {
    http_response_code(405);
    echo json_encode(['message' => 'Método no permitido']);
}
?>