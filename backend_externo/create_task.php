<?php
require_once 'config.php'; // Incluye la configuración de la base de datos

// Asegurarse de que la solicitud es POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Obtener los datos JSON enviados por el frontend
    $data = json_decode(file_get_contents('php://input'), true);

    // Validar si se recibieron todos los campos necesarios, incluyendo subtitle y user_id
    if (!isset($data['title'], $data['subtitle'], $data['description'], $data['price'], $data['currency'], $data['difficulty'], $data['category'], $data['user_id'])) {
        http_response_code(400); // Bad Request
        echo json_encode(['message' => 'Faltan campos obligatorios, incluyendo el subtítulo o el ID del usuario.']);
        exit;
    }

    // Sanitizar los datos para prevenir inyecciones SQL
    $title = $conn->real_escape_string($data['title']);
    $subtitle = $conn->real_escape_string($data['subtitle']);
    $description = $conn->real_escape_string($data['description']);
    $price = floatval($data['price']);
    $currency = $conn->real_escape_string($data['currency']);
    $difficulty = $conn->real_escape_string($data['difficulty']);
    $category = $conn->real_escape_string($data['category']);
    $userId = intval($data['user_id']);

    // Validar los valores de los campos de selección (opcional pero recomendado)
    $allowed_currencies = ['USDC']; // Solo USDC permitido
    $allowed_difficulties = ['Fácil', 'Intermedio', 'Difícil'];
    $allowed_categories = ['Desarrollo', 'Diseño', 'Marketing', 'Blockchain', 'Contenido'];

    if (!in_array($currency, $allowed_currencies) || !in_array($difficulty, $allowed_difficulties) || !in_array($category, $allowed_categories)) {
         http_response_code(400); // Bad Request
         echo json_encode(['message' => 'Valores inválidos en moneda, dificultad o categoría.']);
         exit;
    }

    // Opcional: Verificar si el user_id existe en la tabla users
    $check_user = $conn->query("SELECT id FROM users WHERE id = $userId");
    if ($check_user->num_rows === 0) {
        http_response_code(404); // Not Found
        echo json_encode(['message' => 'Usuario creador no encontrado.']);
        exit;
    }


    // Preparar la consulta SQL usando prepared statements
    $stmt = $conn->prepare("INSERT INTO tasks (title, subtitle, description, price, currency, difficulty, category, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sssdsssi", $title, $subtitle, $description, $price, $currency, $difficulty, $category, $userId);

    // Ejecutar la consulta
    if ($stmt->execute()) {
        $task_id = $conn->insert_id;
        error_log("Tarea creada exitosamente - ID: $task_id, Usuario: $userId");
        
        // Actualizar límites del usuario en la tabla users
        try {
        $cooldown_until = date('Y-m-d H:i:s', time() + 7200); // 2 horas
            $current_time = date('Y-m-d H:i:s');
            
            // Primero obtener los valores actuales para incrementarlos correctamente
            $get_current = $conn->query("SELECT tasks_today, tasks_this_week FROM users WHERE id = $userId");
            if ($get_current) {
                $current_values = $get_current->fetch_assoc();
                
                $tasks_today_new = isset($current_values['tasks_today']) ? intval($current_values['tasks_today']) + 1 : 1;
                $tasks_this_week_new = isset($current_values['tasks_this_week']) ? intval($current_values['tasks_this_week']) + 1 : 1;
                
                // Intentar actualizar con last_task_created primero
                $update_limits = $conn->prepare("
                    UPDATE users 
                SET last_task_created = ?, 
                        tasks_today = ?, 
                        tasks_this_week = ?, 
                    cooldown_until = ?, 
                    updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
            ");
                
                if ($update_limits) {
                    $update_limits->bind_param("siisi", $current_time, $tasks_today_new, $tasks_this_week_new, $cooldown_until, $userId);
                    
                    if ($update_limits->execute()) {
                        error_log("Límites actualizados para usuario $userId - Tasks today: $tasks_today_new, Tasks week: $tasks_this_week_new");
        } else {
                        error_log("Error al actualizar límites (con last_task_created): " . $update_limits->error);
                        // Intentar sin last_task_created
                        $update_limits->close();
                        $update_limits2 = $conn->prepare("
                            UPDATE users 
                            SET tasks_today = ?, 
                                tasks_this_week = ?, 
                    cooldown_until = ?,
                                updated_at = CURRENT_TIMESTAMP 
                            WHERE id = ?
                        ");
                        if ($update_limits2) {
                            $update_limits2->bind_param("iisi", $tasks_today_new, $tasks_this_week_new, $cooldown_until, $userId);
                            if ($update_limits2->execute()) {
                                error_log("Límites actualizados (sin last_task_created) para usuario $userId");
                            } else {
                                error_log("Error al actualizar límites (sin last_task_created): " . $update_limits2->error);
                            }
                            $update_limits2->close();
                        }
                    }
                    if ($update_limits) {
                        $update_limits->close();
                    }
                } else {
                    error_log("Error preparando consulta de actualización de límites: " . $conn->error);
                }
        } else {
                error_log("Error obteniendo valores actuales de límites: " . $conn->error);
            }
        } catch (Exception $e) {
            error_log("Excepción al actualizar límites: " . $e->getMessage());
            // No fallar la creación de la tarea si falla la actualización de límites
        }

        // Los datos del contrato ya están guardados en la tabla tasks
        // El campo escrow_id se llenará cuando se cree el smart contract
        
        // Éxito: devolver un mensaje de confirmación
        http_response_code(201); // Created
        echo json_encode(['message' => 'Tarea creada exitosamente.', 'task_id' => $task_id]);
    } else {
        // Error en la inserción
        $error_msg = $stmt->error ? $stmt->error : 'Error desconocido';
        error_log("Error al crear tarea: " . $error_msg);
        http_response_code(500); // Internal Server Error
        echo json_encode(['message' => 'Error al crear la tarea: ' . $error_msg]);
    }
    
    $stmt->close();

    // Cerrar la conexión a la base de datos
    $conn->close();

} else {
    // Si la solicitud no es POST, devolver método no permitido
    http_response_code(405); // Method Not Allowed
    echo json_encode(['message' => 'Método no permitido']);
}
?>