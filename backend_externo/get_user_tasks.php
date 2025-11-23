<?php
require_once 'config.php'; // Incluye la configuración de la base de datos

// Required headers for CORS (assuming you need them here too)
header("Access-Control-Allow-Origin: *"); // Permite solicitudes desde cualquier origen
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); // Incluye OPTIONS para pre-flight requests
header("Access-Control-Max-Age: 3600"); // Cachea las opciones por 1 hora
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");


// Asegurarse de que la solicitud es GET y que se recibe el user_id
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Obtener el user_id de la solicitud GET
    if (!isset($_GET['user_id'])) {
        http_response_code(400); // Bad Request
        echo json_encode(['message' => 'Falta el ID del usuario.']);
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

    // Preparar la consulta SQL para obtener las tareas del usuario, el recuento de propuestas
    // Y un indicador de si existe una propuesta aceptada
    $sql = "SELECT
                t.id,
                t.title,
                t.subtitle,
                t.price,
                t.currency,
                t.difficulty,
                t.category,
                u.username AS creator_username, -- Obtener el nombre del usuario creador
                t.created_at,
                COUNT(a.id) AS proposal_count, -- Contar el número de propuestas
                MAX(CASE WHEN a.status = 'accepted' THEN 1 ELSE 0 END) AS has_accepted_proposal, -- Indicador si hay alguna propuesta aceptada
                (SELECT ap.applicant_id FROM applications ap WHERE ap.task_id = t.id AND ap.status = 'accepted' LIMIT 1) AS accepted_applicant_id -- Obtener el ID del aplicante aceptado (si existe)
            FROM
                tasks t
            JOIN
                users u ON t.user_id = u.id
            LEFT JOIN
                applications a ON t.id = a.task_id -- Usar la tabla applications y su columna task_id
            WHERE
                t.user_id = $userId -- Filtrar por el ID del usuario logeado
            GROUP BY
                t.id -- Agrupar por tarea para el conteo y el MAX
            ORDER BY
                t.created_at DESC"; // Opcional: ordenar por fecha de creación

    $result = $conn->query($sql);

    if ($result === false) { // Check for query errors
         http_response_code(500);
         echo json_encode(['message' => 'Error al obtener tareas del usuario: ' . $conn->error]);
         exit;
    }

    $tasks = [];
    if ($result->num_rows > 0) {
        // Recorrer los resultados y almacenarlos en un array
        while($row = $result->fetch_assoc()) {
             // Convert has_accepted_proposal from 0/1 to boolean true/false
            $row['has_accepted_proposal'] = (bool)$row['has_accepted_proposal'];
            $tasks[] = $row;
        }
    }

    // Devolver las tareas en formato JSON
    http_response_code(200); // OK
    echo json_encode($tasks);

    // Cerrar la conexión a la base de datos
    $conn->close();

} else {
    // Si la solicitud no es GET, devolver método no permitido
    http_response_code(405); // Method Not Allowed
    echo json_encode(['message' => 'Método no permitido']);
}
?>