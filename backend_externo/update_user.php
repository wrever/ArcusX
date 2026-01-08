<?php
require_once 'config.php';

// Headers CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $id = intval($data['id']);
    $name = $conn->real_escape_string($data['name']);
    $email = $conn->real_escape_string($data['email']);
    $currentPassword = isset($data['currentPassword']) ? $data['currentPassword'] : '';
    $newPassword = isset($data['newPassword']) ? $data['newPassword'] : '';

    // Obtener datos actuales del usuario
    $result = $conn->query("SELECT * FROM users WHERE id = $id");
    if ($result->num_rows !== 1) {
        http_response_code(404);
        echo json_encode(['message' => 'Usuario no encontrado']);
        exit;
    }
    $user = $result->fetch_assoc();

    // Validar si el email ya existe para otro usuario
    $check_email = $conn->query("SELECT id FROM users WHERE email = '$email' AND id != $id");
    if ($check_email->num_rows > 0) {
        http_response_code(400);
        echo json_encode(['message' => 'El correo electrónico ya está en uso por otro usuario']);
        exit;
    }

    // Si se quiere cambiar la contraseña
    if (!empty($newPassword)) {
        if (empty($currentPassword) || !password_verify($currentPassword, $user['password'])) {
            http_response_code(400);
            echo json_encode(['message' => 'La contraseña actual es incorrecta']);
            exit;
        }
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $update = $conn->query("UPDATE users SET username = '$name', email = '$email', password = '$hashedPassword' WHERE id = $id");
    } else {
        // Solo actualizar nombre y correo
        $update = $conn->query("UPDATE users SET username = '$name', email = '$email' WHERE id = $id");
    }

    if ($update) {
        // Obtener los datos actualizados
        $updatedUser = $conn->query("SELECT id, username, email FROM users WHERE id = $id")->fetch_assoc();
        echo json_encode([
            'message' => 'Usuario actualizado correctamente',
            'user' => $updatedUser
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['message' => 'Error al actualizar usuario']);
    }
} else {
    http_response_code(405);
    echo json_encode(['message' => 'Método no permitido']);
}
?>