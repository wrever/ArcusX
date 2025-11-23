<?php
require_once 'config.php'; // Incluye la configuración de la base de datos

// Asegurarse de que la solicitud es GET
if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    // Preparar la consulta SQL para obtener todas las tareas
    // Hacemos un JOIN con la tabla users para obtener el nombre del creador
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
            t.status -- <-- Añadido el campo status
        FROM
            tasks t
        JOIN
            users u ON t.user_id = u.id
        WHERE
            t.accepted_applicant_id IS NULL
            AND t.status = 'open'
        ORDER BY
            t.created_at DESC"; // Opcional: ordenar por fecha de creación
    $result = $conn->query($sql);

    $tasks = [];
    if ($result->num_rows > 0) {
        // Recorrer los resultados y almacenar los resultados en un array
        while($row = $result->fetch_assoc()) {
            $tasks[] = $row;
        }
    }

    // Devolver las tareas en formato JSON
    echo json_encode($tasks);

    // Cerrar la conexión a la base de datos
    $conn->close();

} else {
    // Si la solicitud no es GET, devolver método no permitido
    http_response_code(405); // Method Not Allowed
    echo json_encode(['message' => 'Método no permitido']);
}
?>