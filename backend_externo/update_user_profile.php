<?php
/**
 * Endpoint para actualizar datos de perfil público del usuario
 * POST /api/auth/update_user_profile.php
 * Headers: Authorization: Bearer {JWT_TOKEN}
 * Body JSON: { "bio"?: string, "portfolio_url"?: string, "public_profile"?: bool }
 */

require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('POST, OPTIONS');
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
require_once __DIR__ . '/auth_bearer.php';

arcusx_cors_apply('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido'
    ]);
    exit();
}

$userId = arcusx_jwt_user_id();
if ($userId === null) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Acceso no autorizado: Token JWT no proporcionado o inválido.'
    ]);
    $conn->close();
    exit();
}

// Asegurar columnas necesarias (bio, portfolio_url, public_profile, skills) sin romper si ya existen
try {
    $columns = [
        'bio' => "TEXT NULL", 
        'portfolio_url' => "VARCHAR(500) NULL", 
        'public_profile' => "TINYINT(1) DEFAULT 1",
        'skills' => "TEXT NULL"
    ];
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

if (isset($data['skills'])) {
    $skills = $data['skills'];
    if (is_array($skills)) {
        $skillsJson = json_encode($skills);
        $updates[] = "skills = ?";
        $params[] = $skillsJson;
        $types .= 's';
    } else if ($skills === null || $skills === '') {
        $updates[] = "skills = ?";
        $params[] = null;
        $types .= 's';
    }
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

