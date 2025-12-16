<?php
/**
 * Endpoint para subir avatar/foto de perfil
 * POST /api/auth/upload_avatar.php
 * Content-Type: multipart/form-data
 * Headers: Authorization: Bearer {JWT_TOKEN}
 * Campo: file (imagen)
 */

require_once 'config.php';

$autoload_path = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoload_path)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en el servidor: Falta la carpeta de dependencias (vendor).'
    ]);
    exit();
}
require $autoload_path;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$jwt_secret = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY";

function getLoggedInUserIdForAvatar($secret_key) {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';

    if (empty($authHeader) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }

    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $jwt = $matches[1];
        try {
            JWT::$leeway = 300;
            $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));
            if (isset($decoded->data->id)) {
                return (int)$decoded->data->id;
            }
        } catch (Exception $e) {
            error_log("JWT Error en upload_avatar.php: " . $e->getMessage());
            return null;
        }
    }
    return null;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido'
    ]);
    exit();
}

$userId = getLoggedInUserIdForAvatar($jwt_secret);
if (!$userId) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Acceso no autorizado: Token JWT no proporcionado o inválido.'
    ]);
    $conn->close();
    exit();
}

// Asegurar columna avatar_url
try {
    $check = $conn->query("SHOW COLUMNS FROM users LIKE 'avatar_url'");
    if ($check && $check->num_rows === 0) {
        $conn->query("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL");
    }
} catch (Exception $e) {
    error_log("Error asegurando columna avatar_url: " . $e->getMessage());
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'No se recibió archivo o hubo un error en la subida'
    ]);
    $conn->close();
    exit();
}

$file = $_FILES['file'];

// Validar tipo MIME
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Tipo de archivo no permitido. Usa JPG, PNG o WEBP'
    ]);
    $conn->close();
    exit();
}

// Validar tamaño (máx 5MB)
$maxSize = 5 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'El archivo es demasiado grande. Máximo 5MB'
    ]);
    $conn->close();
    exit();
}

// Directorio de subida
$uploadDir = __DIR__ . '/uploads/avatars/';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}

$extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$fileName = $userId . '_' . time() . '_' . uniqid() . '.' . $extension;
$destPath = $uploadDir . $fileName;

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al guardar el archivo en el servidor'
    ]);
    $conn->close();
    exit();
}

// Construir URL pública relativa (el servidor debe servir /api/uploads/avatars/)
$avatarUrl = '/api/uploads/avatars/' . $fileName;

// Borrar avatar anterior si es local
$stmtOld = $conn->prepare("SELECT avatar_url FROM users WHERE id = ?");
if ($stmtOld) {
    $stmtOld->bind_param("i", $userId);
    $stmtOld->execute();
    $resOld = $stmtOld->get_result();
    if ($resOld && $resOld->num_rows > 0) {
        $row = $resOld->fetch_assoc();
        if (!empty($row['avatar_url']) && strpos($row['avatar_url'], '/api/uploads/avatars/') === 0) {
            $oldPath = __DIR__ . str_replace('/api', '', $row['avatar_url']);
            if (is_file($oldPath)) {
                @unlink($oldPath);
            }
        }
    }
    $stmtOld->close();
}

// Actualizar en BD
$stmt = $conn->prepare("UPDATE users SET avatar_url = ? WHERE id = ?");
if ($stmt === false) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al preparar actualización de avatar: ' . $conn->error
    ]);
    $conn->close();
    exit();
}

$stmt->bind_param("si", $avatarUrl, $userId);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al actualizar avatar en la base de datos: ' . $stmt->error
    ]);
    $stmt->close();
    $conn->close();
    exit();
}

$stmt->close();

http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Avatar actualizado correctamente',
    'avatar_url' => $avatarUrl
]);

$conn->close();


