<?php
require_once __DIR__ . '/lib/security_headers.php';
require_once __DIR__ . '/lib/require_autoload.php';
/**
 * Endpoint para actualizar datos de perfil público del usuario
 * POST /api/auth/update_user_profile.php
 * Headers: Authorization: Bearer {JWT_TOKEN}
 * Body JSON: { "bio"?: string, "portfolio_url"?: string, "public_profile"?: bool }
 */

require_once 'config.php';

require $autoload_path;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// Headers CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$jwt_secret = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY";

function getLoggedInUserIdForProfile($secret_key) {
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
            error_log("JWT Error en update_user_profile.php: " . $e->getMessage());
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

$userId = getLoggedInUserIdForProfile($jwt_secret);
if (!$userId) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Acceso no autorizado: Token JWT no proporcionado o inválido.'
    ]);
    $conn->close();
    exit();
}

// Asegurar columnas necesarias (bio, portfolio_url, public_profile) sin romper si ya existen
try {
    $columns = ['bio' => "TEXT NULL", 'portfolio_url' => "VARCHAR(500) NULL", 'public_profile' => "TINYINT(1) DEFAULT 1"];
    foreach ($columns as $col => $definition) {
        $check = $conn->query("SHOW COLUMNS FROM users LIKE '" . $col . "'");
        if ($check && $check->num_rows === 0) {
            $conn->query("ALTER TABLE users ADD COLUMN " . $col . " " . $definition);
        }
    }
} catch (Exception $e) {
    // No romper si falla el ALTER, solo loguear
    error_log("Error verificando/creando columnas de perfil: " . $e->getMessage());
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'JSON inválido'
    ]);
    $conn->close();
    exit();
}

$updates = [];
$params = [];
$types = '';

if (isset($data['bio'])) {
    $bio = trim($data['bio']);
    if (strlen($bio) > 1000) {
        $bio = substr($bio, 0, 1000);
    }
    $updates[] = "bio = ?";
    $params[] = $bio;
    $types .= 's';
}

if (isset($data['portfolio_url'])) {
    $portfolioUrl = trim($data['portfolio_url']);
    if ($portfolioUrl !== '' && !filter_var($portfolioUrl, FILTER_VALIDATE_URL)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'URL de portfolio inválida'
        ]);
        $conn->close();
        exit();
    }
    $updates[] = "portfolio_url = ?";
    $params[] = $portfolioUrl !== '' ? $portfolioUrl : null;
    $types .= 's';
}

if (isset($data['public_profile'])) {
    $publicProfile = $data['public_profile'] ? 1 : 0;
    $updates[] = "public_profile = ?";
    $params[] = $publicProfile;
    $types .= 'i';
}

if (empty($updates)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'No hay campos para actualizar'
    ]);
    $conn->close();
    exit();
}

$params[] = $userId;
$types .= 'i';

$sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
$stmt = $conn->prepare($sql);
if ($stmt === false) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al preparar la consulta: ' . $conn->error
    ]);
    $conn->close();
    exit();
}

$stmt->bind_param($types, ...$params);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al actualizar perfil: ' . $stmt->error
    ]);
    $stmt->close();
    $conn->close();
    exit();
}

$stmt->close();

http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Perfil actualizado correctamente'
]);

$conn->close();

