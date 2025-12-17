<?php
require_once __DIR__ . '/lib/security_headers.php';
require_once __DIR__ . '/lib/require_autoload.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config.php';

// Verificar si el archivo autoload.php existe
require $autoload_path;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['supabase_user_id']) || !isset($data['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
    exit();
}

$supabase_user_id = $data['supabase_user_id'];
$email = $data['email'];
$name = $data['name'] ?? $email;
$avatar_url = $data['avatar_url'] ?? null;

// Configuración JWT (igual que en login.php)
$secret_key = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY";
$issuedAt = time();
$expirationTime = $issuedAt + (3600 * 24); // 1 día
$issuer = "arcusx.pro";

try {
    // Verificar si el usuario ya existe por email
    $stmt = $conn->prepare("SELECT id, username, email FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $existingUser = $result->fetch_assoc();

    if ($existingUser) {
        // Usuario existe, actualizar supabase_user_id si no lo tiene
        $checkSupabaseStmt = $conn->prepare("SELECT supabase_user_id FROM users WHERE id = ?");
        $checkSupabaseStmt->bind_param("i", $existingUser['id']);
        $checkSupabaseStmt->execute();
        $supabaseResult = $checkSupabaseStmt->get_result();
        $userData = $supabaseResult->fetch_assoc();
        
        if (empty($userData['supabase_user_id'] ?? null)) {
            // Verificar si la columna existe, si no, agregarla
            $updateStmt = $conn->prepare("UPDATE users SET supabase_user_id = ? WHERE id = ?");
            if ($updateStmt) {
                $updateStmt->bind_param("si", $supabase_user_id, $existingUser['id']);
                $updateStmt->execute();
            }
        }
        
        $userId = $existingUser['id'];
        $username = $existingUser['username'];
    } else {
        // Usuario no existe, crear nuevo usuario
        // Generar username único si no se proporciona
        $username = $data['username'] ?? strtolower(str_replace(' ', '', preg_replace('/[^a-zA-Z0-9]/', '', $name))) . '_' . substr($supabase_user_id, 0, 8);
        
        // Verificar que el username sea único
        $checkStmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
        $checkStmt->bind_param("s", $username);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        if ($checkResult->num_rows > 0) {
            $username = $username . '_' . time();
        }

        // Intentar insertar con supabase_user_id y avatar_url si las columnas existen
        $insertStmt = $conn->prepare("INSERT INTO users (username, email, created_at) VALUES (?, ?, NOW())");
        if ($insertStmt) {
            $insertStmt->bind_param("ss", $username, $email);
            $insertStmt->execute();
            $userId = $conn->insert_id;
            
            // Si las columnas existen, actualizarlas
            if ($userId) {
                // Intentar actualizar supabase_user_id si la columna existe
                $updateSupabaseStmt = $conn->prepare("UPDATE users SET supabase_user_id = ? WHERE id = ?");
                if ($updateSupabaseStmt) {
                    $updateSupabaseStmt->bind_param("si", $supabase_user_id, $userId);
                    $updateSupabaseStmt->execute();
                }
            }
        } else {
            throw new Exception('Error al preparar la consulta de inserción');
        }
    }

    // Generar token JWT (igual estructura que login.php)
    $payload = [
        'iat' => $issuedAt,
        'exp' => $expirationTime,
        'iss' => $issuer,
        'data' => [
            'id' => $userId,
            'username' => $username
        ]
    ];

    $jwt = JWT::encode($payload, $secret_key, 'HS256');

    echo json_encode([
        'success' => true,
        'token' => $jwt,
        'user' => [
            'id' => $userId,
            'username' => $username,
            'email' => $email
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>

