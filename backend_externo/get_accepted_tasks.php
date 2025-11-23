<?php
// Required headers
header("Access-Control-Allow-Origin: *"); // Permite solicitudes desde cualquier origen
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); // Incluye OPTIONS para pre-flight requests
header("Access-Control-Max-Age: 3600"); // Cachea las opciones por 1 hora
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Incluir el archivo de configuración de la base de datos.
require_once 'config.php';

// Asegurarse de que la solicitud es GET
if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    // Validar si se recibió el ID del usuario en la URL usando 'user_id'
    if (!isset($_GET['user_id'])) {
        http_response_code(400); // Bad Request
        echo json_encode(['message' => 'User ID no proporcionado.']);
        exit;
    }

    $userId = intval($_GET['user_id']);

    // Opcional: Verificar si el user_id existe en la tabla users
    $check_user = $conn->query("SELECT id FROM users WHERE id = $userId");
    if ($check_user === false) { // Check for query errors
         http_response_code(500);
         echo json_encode(['message' => 'Error al verificar usuario: ' . $conn->error]);
         exit;
    }
    if ($check_user->num_rows === 0) {
        http_response_code(404); // Not Found
        echo json_encode(['message' => 'Usuario no encontrado.']);
        exit;
    }

    // Preparar la consulta SQL para obtener las tareas donde el usuario ha sido aceptado
    // Unimos con \'applications\' y \'users\', y seleccionamos el applicant_id directamente
    $sql = "SELECT
                t.id,
                t.title,
                t.subtitle,
                t.description,
                t.price,
                t.currency,
                t.difficulty,
                t.category,
                u.username AS creator_username,
                t.created_at,
                a.applicant_id AS accepted_applicant_id -- **ESTA LÍNEA ES CLAVE**
            FROM
                tasks t
            JOIN
                applications a ON t.id = a.task_id -- Unir con aplicaciones
            JOIN
                users u ON t.user_id = u.id -- Unir para obtener el username del creador
            WHERE
                a.applicant_id = $userId AND a.status = 'accepted' -- Filtrar solo por tareas donde el usuario es el aplicante aceptado
            ORDER BY
                t.created_at DESC";


    // Ejecutar la consulta (asumiendo que $conn es la conexión a la base de datos de config.php)
    $result = $conn->query($sql);

    if ($result === false) { // Check for query errors
         http_response_code(500); // Internal Server Error
         echo json_encode(array("message" => "Error al obtener tareas aceptadas: " . $conn->error));
         exit;
    }

    $tasks = [];
    if ($result->num_rows > 0) {
        // Recorrer los resultados y almacenarlos en un array
        while($row = $result->fetch_assoc()) {
            // No necesitamos has_accepted_proposal aquí, ya que todas son aceptadas por definición
            // Podemos simplemente castear accepted_applicant_id a int si es necesario, aunque PHP suele manejarlo
             $row['accepted_applicant_id'] = (int)$row['accepted_applicant_id']; // Asegurar que es un número
            $tasks[] = $row;
        }
    }

    // Devolver las tareas en formato JSON
    http_response_code(200); // OK
    echo json_encode($tasks);

    // Cerrar la conexión a la base de datos (si tu config.php no lo cierra automáticamente)
    // $conn->close(); // Descomenta si necesitas cerrar explícitamente

} else {
    // Si la solicitud no es GET, devolver método no permitido
    http_response_code(405); // Method Not Allowed
    echo json_encode(['message' => 'Método no permitido']);
}

?>