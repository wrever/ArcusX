<?php
// Required headers for CORS
header("Access-Control-Allow-Origin: *"); // Permite solicitudes desde cualquier origen
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); // Incluye OPTIONS para pre-flight requests
header("Access-Control-Max-Age: 3600"); // Cachea las opciones por 1 hora
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Incluir el archivo de configuración de la base de datos.
require_once 'config.php'; // Asegúrate de que la ruta a config.php es correcta

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
        // Usuario encontrado: devolver sus detalles en formato JSON
        $user = $result->fetch_assoc();
        // Asegurar que el ID sea string para consistencia con el frontend
        $user['id'] = strval($user['id']);
        http_response_code(200); // OK
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