<?php
/**
 * create_task.php
 * Endpoint para crear una nueva tarea
 * 
 * NOTA IMPORTANTE: El campo 'price' ahora representa el monto que recibirá el trabajador (workerAmount).
 * La comisión de plataforma se calcula y se cobra adicionalmente al crear el escrow.
 * 
 * Ejemplo:
 * - Cliente ingresa: $10 (workerAmount)
 * - Se guarda en BD: price = 10
 * - Al crear escrow: amount = 10, commission = 0.05, totalToFund = 10.05
 */

require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('GET, POST, OPTIONS');
arcusx_cors_apply('GET, POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

// Habilitar logs (pero NO mostrar errores en pantalla para evitar output antes de headers)
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

require_once 'config.php';

try {
    // Asegurarse de que la solicitud es POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido. Solo se permite POST.']);
        exit();
    }

    // Obtener los datos JSON enviados por el frontend
    $data = json_decode(file_get_contents('php://input'), true);

    // Validar si se recibieron todos los campos necesarios, incluyendo subtitle y user_id
    if (!isset($data['title'], $data['subtitle'], $data['description'], $data['price'], $data['currency'], $data['difficulty'], $data['category'], $data['user_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Faltan campos obligatorios, incluyendo el subtítulo o el ID del usuario.']);
        exit();
    }

    // Sanitizar los datos para prevenir inyecciones SQL
    $title = $conn->real_escape_string($data['title']);
    $subtitle = $conn->real_escape_string($data['subtitle']);
    $description = $conn->real_escape_string($data['description']);
    // El price ahora es el workerAmount (monto que recibirá el trabajador)
    $price = floatval($data['price']);
    
    // Validar que el price sea positivo
    if ($price <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El precio debe ser mayor a 0.']);
        exit();
    }
    $currency = $conn->real_escape_string($data['currency']);
    $difficulty = $conn->real_escape_string($data['difficulty']);
    $category = $conn->real_escape_string($data['category']);
    $userId = intval($data['user_id']);

    // Validar los valores de los campos de selección (opcional pero recomendado)
    $allowed_currencies = ['USDC']; // Solo USDC permitido
    $allowed_difficulties = ['Fácil', 'Intermedio', 'Difícil'];
    $allowed_categories = ['Desarrollo', 'Diseño', 'Marketing', 'Blockchain', 'Contenido'];

    if (!in_array($currency, $allowed_currencies) || !in_array($difficulty, $allowed_difficulties) || !in_array($category, $allowed_categories)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Valores inválidos en moneda, dificultad o categoría.']);
        exit();
    }

    // Opcional: Verificar si el user_id existe en la tabla users
    $check_user = $conn->query("SELECT id FROM users WHERE id = $userId");
    if ($check_user->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Usuario creador no encontrado.']);
        exit();
    }

    $hasPrivateCols = false;
    $pc = $conn->query("SHOW COLUMNS FROM tasks LIKE 'is_private_invite'");
    if ($pc && $pc->num_rows > 0) {
        $hasPrivateCols = true;
    }

    $isPrivateInvite = 0;
    $invitedUserId = null;
    if ($hasPrivateCols && !empty($data['is_private_invite']) && ($data['is_private_invite'] === true || $data['is_private_invite'] === 1 || $data['is_private_invite'] === '1')) {
        $isPrivateInvite = 1;
        if (!isset($data['invited_user_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Oferta privada: falta invited_user_id.']);
            exit();
        }
        $invitedUserId = intval($data['invited_user_id']);
        if ($invitedUserId <= 0 || $invitedUserId === $userId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'invited_user_id inválido o igual al creador.']);
            exit();
        }
        $chkInv = $conn->query("SELECT id FROM users WHERE id = $invitedUserId");
        if (!$chkInv || $chkInv->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'El freelancer invitado no existe.']);
            exit();
        }
    }

    // Preparar la consulta SQL usando prepared statements
    if ($hasPrivateCols && $isPrivateInvite === 1) {
        $stmt = $conn->prepare("INSERT INTO tasks (title, subtitle, description, price, currency, difficulty, category, user_id, invited_user_id, is_private_invite) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)");
        if (!$stmt) {
            throw new Exception('Error al preparar la consulta: ' . $conn->error);
        }
        $stmt->bind_param("sssdsssii", $title, $subtitle, $description, $price, $currency, $difficulty, $category, $userId, $invitedUserId);
    } elseif ($hasPrivateCols) {
        $stmt = $conn->prepare("INSERT INTO tasks (title, subtitle, description, price, currency, difficulty, category, user_id, invited_user_id, is_private_invite) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 0)");
        if (!$stmt) {
            throw new Exception('Error al preparar la consulta: ' . $conn->error);
        }
        $stmt->bind_param("sssdsssi", $title, $subtitle, $description, $price, $currency, $difficulty, $category, $userId);
    } else {
        $stmt = $conn->prepare("INSERT INTO tasks (title, subtitle, description, price, currency, difficulty, category, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        if (!$stmt) {
            throw new Exception('Error al preparar la consulta: ' . $conn->error);
        }
        $stmt->bind_param("sssdsssi", $title, $subtitle, $description, $price, $currency, $difficulty, $category, $userId);
    }

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
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Tarea creada exitosamente.',
            'task_id' => $task_id
        ]);
    } else {
        // Error en la inserción
        $error_msg = $stmt->error ? $stmt->error : 'Error desconocido';
        error_log("Error al crear tarea: " . $error_msg);
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al crear la tarea: ' . $error_msg
        ]);
    }
    
    $stmt->close();

} catch (Exception $e) {
    error_log('Error en create_task.php: ' . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error al procesar solicitud',
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>
