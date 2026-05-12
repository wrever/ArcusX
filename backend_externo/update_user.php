<?php
require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('POST, OPTIONS');
require_once 'config.php';

ini_set('display_errors', 0);

$autoload_path = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoload_path)) {
    http_response_code(500);
    echo json_encode(['message' => 'Error en el servidor: Falta la carpeta de dependencias (vendor).']);
    exit();
}
require $autoload_path;
require_once __DIR__ . '/auth_bearer.php';

arcusx_cors_apply('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Método no permitido']);
    exit;
}

// 1. Validar JWT — 401 si ausente o inválido
$tokenUserId = arcusx_jwt_user_id();
if ($tokenUserId === null) {
    http_response_code(401);
    echo json_encode(['message' => 'Acceso no autorizado: Token JWT requerido o inválido.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$id = intval($data['id'] ?? 0);

// 2. El user_id del token debe coincidir con el id a editar — 403 si no
if ($tokenUserId !== $id) {
    http_response_code(403);
    echo json_encode(['message' => 'Prohibido: No tienes permiso para editar este usuario.']);
    exit;
}

$name            = trim($data['name'] ?? '');
$email           = trim($data['email'] ?? '');
$currentPassword = $data['currentPassword'] ?? '';
$newPassword     = $data['newPassword'] ?? '';

// 3. Obtener datos actuales del usuario
$stmt = $conn->prepare("SELECT * FROM users WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows !== 1) {
    $stmt->close();
    http_response_code(404);
    echo json_encode(['message' => 'Usuario no encontrado']);
    exit;
}
$user = $result->fetch_assoc();
$stmt->close();

// 4. Verificar si el email ya existe para otro usuario
$stmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
$stmt->bind_param("si", $email, $id);
$stmt->execute();
$emailCheck = $stmt->get_result();
$stmt->close();
if ($emailCheck->num_rows > 0) {
    http_response_code(400);
    echo json_encode(['message' => 'El correo electrónico ya está en uso por otro usuario']);
    exit;
}

// 5. Actualizar usuario
if (!empty($newPassword)) {
    if (empty($currentPassword) || !password_verify($currentPassword, $user['password'])) {
        http_response_code(400);
        echo json_encode(['message' => 'La contraseña actual es incorrecta']);
        exit;
    }
    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $conn->prepare("UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?");
    $stmt->bind_param("sssi", $name, $email, $hashedPassword, $id);
} else {
    $stmt = $conn->prepare("UPDATE users SET username = ?, email = ? WHERE id = ?");
    $stmt->bind_param("ssi", $name, $email, $id);
}

$ok = $stmt->execute();
$stmt->close();

if ($ok) {
    $stmt = $conn->prepare("SELECT id, username, email FROM users WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $updatedUser = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    echo json_encode([
        'message' => 'Usuario actualizado correctamente',
        'user'    => $updatedUser
    ]);
} else {
    http_response_code(500);
    echo json_encode(['message' => 'Error al actualizar usuario']);
}
?>
