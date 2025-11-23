<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $username = $conn->real_escape_string($data['username']);
    $email = $conn->real_escape_string($data['email']);
    $password = password_hash($data['password'], PASSWORD_DEFAULT);
    
    // Verificar si el email ya existe
    $check_email = $conn->query("SELECT id FROM users WHERE email = '$email'");
    if ($check_email->num_rows > 0) {
        http_response_code(400);
        echo json_encode(['message' => 'El email ya está registrado']);
        exit;
    }
    
    // Insertar nuevo usuario
    $sql = "INSERT INTO users (username, email, password) VALUES ('$username', '$email', '$password')";
    
    if ($conn->query($sql)) {
        echo json_encode(['message' => 'Usuario registrado exitosamente']);
    } else {
        http_response_code(500);
        echo json_encode(['message' => 'Error al registrar usuario']);
    }
} else {
    http_response_code(405);
    echo json_encode(['message' => 'Método no permitido']);
}
?>