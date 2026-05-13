<?php
// Required headers for CORS
require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('GET, POST, OPTIONS');
require_once __DIR__ . '/config.php';
arcusx_cors_apply('GET, POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

// Asegurarse de que la solicitud es GET y que se recibe el user_id
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Obtener el user_id de la solicitud GET
    if (!isset($_GET['user_id']) || empty($_GET['user_id'])) {
        http_response_code(400); // Bad Request
        echo json_encode(['message' => 'Falta el ID del usuario.']);
        exit;
    }

    $userId = intval($_GET['user_id']);
    
    // Validar que el user_id sea válido
    if ($userId <= 0) {
        http_response_code(400); // Bad Request
        echo json_encode(['message' => 'ID de usuario inválido.']);
        exit;
    }

    // Preparar la consulta SQL usando prepared statements para seguridad
    // Incluir wallet_address para operaciones Stellar
    $stmt = $conn->prepare("SELECT id, username, wallet_address FROM users WHERE id = ? LIMIT 1");
    if ($stmt === false) {
        http_response_code(500);
        echo json_encode(['message' => 'Error al preparar la consulta: ' . $conn->error]);
        exit;
    }
    
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result === false) { // Check for query errors
         http_response_code(500); // Internal Server Error
         echo json_encode(['message' => 'Error al obtener detalles del usuario: ' . $conn->error]);
         exit;
    }

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        $user['id'] = strval($user['id']);
        if (isset($user['username']) && is_string($user['username'])) {
            $user['username'] = fix_utf8_mojibake($user['username']);
        }
        http_response_code(200);
        echo json_encode($user);
    } else {
        // Usuario no encontrado
        http_response_code(404); // Not Found
        echo json_encode(['message' => 'Usuario no encontrado.']);
    }
    
    $stmt->close();

} else {
    // Si la solicitud no es GET, devolver método no permitido
    http_response_code(405); // Method Not Allowed
    echo json_encode(['message' => 'Método no permitido']);
}
?>