<?php
require_once __DIR__ . '/config.php';

// Verificar métodos permitidos
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST', 'DELETE'])) {
    http_response_code(405);
    echo json_encode(['message' => 'Método no permitido. Solo se permite GET, POST, DELETE.']);
    exit();
}

// Obtener el task_id de los parámetros GET
$task_id = isset($_GET['task_id']) ? intval($_GET['task_id']) : null;

if (!$task_id) {
    http_response_code(400);
    echo json_encode(['message' => 'task_id es requerido']);
    exit;
}

// Manejar diferentes tipos de peticiones
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if (isset($_GET['action']) && $_GET['action'] === 'download') {
            handleFileDownload($task_id);
        } else {
            handleGetTaskDetails($task_id);
        }
        break;
    case 'POST':
        handleFileUpload($task_id);
        break;
    case 'DELETE':
        handleFileDelete($task_id);
        break;
}

/**
 * Maneja la obtención de detalles de la tarea
 */
function handleGetTaskDetails($task_id) {
    try {
        // Crear conexión y seleccionar base de datos explícitamente
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($conn->connect_error) {
            throw new Exception("Error de conexión: " . $conn->connect_error);
        }
        
        // Asegurar que la base de datos esté seleccionada
        if (!$conn->select_db(DB_NAME)) {
            throw new Exception("Error al seleccionar la base de datos: " . DB_NAME);
        }
        
        // Establecer charset UTF-8
        $conn->set_charset("utf8mb4");

        // CONSULTA 1: Obtener los detalles básicos de la tarea (sin JOINs complejos)
        $sql = "SELECT 
                    t.id,
                    t.title,
                    t.subtitle,
                    t.description,
                    t.price,
                    t.currency,
                    t.difficulty,
                    t.category,
                    t.created_at,
                    t.user_id,
                    t.status,
                    t.client_accepted_completion,
                    t.worker_accepted_completion,
                    t.files,
                    t.escrow_id,
                    t.escrow_status,
                    t.escrow_created_at,
                    t.escrow_completed_at,
                    t.accepted_applicant_id,
                    u.username as creator_username
                FROM tasks t
                INNER JOIN users u ON t.user_id = u.id
                WHERE t.id = ?";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $task_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['message' => 'Tarea no encontrada']);
            $stmt->close();
            $conn->close();
            return;
        }
        
        $task = $result->fetch_assoc();
        $stmt->close();
        
        // Verificar que user_id no sea null
        if ($task['user_id'] === null || $task['user_id'] === '') {
            http_response_code(500);
            echo json_encode(['message' => 'Error: user_id no encontrado en la tarea']);
            $conn->close();
            return;
        }
        
        // Procesar archivos si existen
        $files = [];
        if (!empty($task['files'])) {
            $files = json_decode($task['files'], true) ?: [];
        }
        
        // La tarea puede ser marcada como completada si el cliente no la ha marcado previamente
        $can_mark_completed = intval($task['client_accepted_completion'] ?? 0) === 0;

        // CONSULTA 2: Obtener wallet del trabajador desde applications (más simple y directo)
        $worker_wallet_address = null;
        $worker_username = null;
        
        if (!empty($task['accepted_applicant_id'])) {
            // Primero intentar obtener desde applications (donde se guardó al aplicar)
            $sql_wallet = "SELECT worker_wallet_address FROM applications 
                          WHERE applicant_id = ? AND task_id = ? AND status = 'accepted' 
                          LIMIT 1";
            $stmt_wallet = $conn->prepare($sql_wallet);
            $stmt_wallet->bind_param("ii", $task['accepted_applicant_id'], $task_id);
            $stmt_wallet->execute();
            $result_wallet = $stmt_wallet->get_result();
            
            if ($result_wallet->num_rows > 0) {
                $wallet_data = $result_wallet->fetch_assoc();
                $worker_wallet_address = $wallet_data['worker_wallet_address'] ?? null;
            }
            $stmt_wallet->close();
            
            // Si no está en applications, obtener desde users como fallback
            if (empty($worker_wallet_address)) {
                $sql_user = "SELECT username, wallet_address FROM users WHERE id = ? LIMIT 1";
                $stmt_user = $conn->prepare($sql_user);
                $stmt_user->bind_param("i", $task['accepted_applicant_id']);
                $stmt_user->execute();
                $result_user = $stmt_user->get_result();
                
                if ($result_user->num_rows > 0) {
                    $user_data = $result_user->fetch_assoc();
                    $worker_wallet_address = $user_data['wallet_address'] ?? null;
                    $worker_username = $user_data['username'] ?? null;
                }
                $stmt_user->close();
            } else {
                // Si tenemos wallet desde applications, obtener username desde users
                $sql_username = "SELECT username FROM users WHERE id = ? LIMIT 1";
                $stmt_username = $conn->prepare($sql_username);
                $stmt_username->bind_param("i", $task['accepted_applicant_id']);
                $stmt_username->execute();
                $result_username = $stmt_username->get_result();
                
                if ($result_username->num_rows > 0) {
                    $username_data = $result_username->fetch_assoc();
                    $worker_username = $username_data['username'] ?? null;
                }
                $stmt_username->close();
            }
        }
        
        // Preparar respuesta
        $response = [
            'id' => intval($task['id']),
            'title' => $task['title'],
            'subtitle' => $task['subtitle'],
            'description' => $task['description'],
            'price' => $task['price'],
            'currency' => $task['currency'],
            'difficulty' => $task['difficulty'],
            'category' => $task['category'],
            'user_id' => strval($task['user_id']),
            'status' => $task['status'] ?? 'active',
            'client_accepted_completion' => intval($task['client_accepted_completion'] ?? 0),
            'worker_accepted_completion' => intval($task['worker_accepted_completion'] ?? 0),
            'creator_username' => $task['creator_username'],
            'created_at' => $task['created_at'],
            'files' => $files,
            'escrow_id' => $task['escrow_id'] ?? null,
            'escrow_status' => $task['escrow_status'] ?? 'pending',
            'escrow_created_at' => $task['escrow_created_at'] ?? null,
            'escrow_completed_at' => $task['escrow_completed_at'] ?? null,
            'accepted_applicant_id' => $task['accepted_applicant_id'] ? strval($task['accepted_applicant_id']) : null,
            'worker_wallet_address' => $worker_wallet_address, // Wallet del trabajador desde la aplicación
            'worker_username' => $worker_username,
            'can_mark_completed' => $can_mark_completed
        ];

        echo json_encode($response);

        $conn->close();

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Error interno del servidor: ' . $e->getMessage()]);
    }
}

/**
 * Maneja la subida de archivos
 */
function handleFileUpload($task_id) {
    // Verificar que se envió un archivo
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No se envió archivo válido']);
        return;
    }
    
    $file = $_FILES['file'];
    
    // Validar tamaño del archivo (máximo 10MB)
    $max_size = 10 * 1024 * 1024; // 10MB
    if ($file['size'] > $max_size) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El archivo es demasiado grande. Máximo 10MB']);
        return;
    }
    
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($conn->connect_error) {
            throw new Exception("Error de conexión: " . $conn->connect_error);
        }
        
        // Crear directorio files si no existe (en la raíz del servidor)
        if (!file_exists('../../files')) {
            mkdir('../../files', 0755, true);
        }
        
        // Generar nombre único para el archivo
        $file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $file_name = pathinfo($file['name'], PATHINFO_FILENAME);
        $unique_name = $file_name . '_' . time() . '_' . uniqid() . '.' . $file_extension;
        $file_path = '../../files/' . $unique_name;
        
        // Mover archivo al directorio
        if (!move_uploaded_file($file['tmp_name'], $file_path)) {
            throw new Exception('Error al guardar archivo');
        }
        
        // Obtener archivos actuales de la tarea
        $stmt = $conn->prepare("SELECT files FROM tasks WHERE id = ?");
        $stmt->bind_param("i", $task_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $task = $result->fetch_assoc();
        
        $current_files = [];
        if (!empty($task['files'])) {
            $current_files = json_decode($task['files'], true) ?: [];
        }
        
        // Agregar nuevo archivo
        $new_file = [
            'id' => uniqid(),
            'name' => $file['name'],
            'filename' => $unique_name,
            'size' => $file['size'],
            'type' => $file['type'],
            'uploaded_at' => date('Y-m-d H:i:s'),
            'uploaded_by' => 'user',
            'url' => "https://arcusx.pro/files/" . $unique_name
        ];
        
        $current_files[] = $new_file;
        
        // Actualizar la columna files en la base de datos
        $files_json = json_encode($current_files);
        $stmt = $conn->prepare("UPDATE tasks SET files = ? WHERE id = ?");
        $stmt->bind_param("si", $files_json, $task_id);
        $stmt->execute();
        
        echo json_encode([
            'success' => true,
            'message' => 'Archivo subido exitosamente',
            'file' => $new_file
        ]);
        
        $stmt->close();
        $conn->close();
        
    } catch (Exception $e) {
        // Eliminar archivo si falla la inserción en BD
        if (isset($file_path) && file_exists($file_path)) {
            unlink($file_path);
        }
        
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

/**
 * Maneja la eliminación de archivos
 */
function handleFileDelete($task_id) {
    // Obtener datos del cuerpo de la petición
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['file_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'file_id es requerido']);
        return;
    }
    
    $file_id = $input['file_id'];
    
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($conn->connect_error) {
            throw new Exception("Error de conexión: " . $conn->connect_error);
        }
        
        // Obtener archivos actuales de la tarea
        $stmt = $conn->prepare("SELECT files FROM tasks WHERE id = ?");
        $stmt->bind_param("i", $task_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $task = $result->fetch_assoc();
        
        if (!$task) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Tarea no encontrada']);
            return;
        }
        
        $current_files = [];
        if (!empty($task['files'])) {
            $current_files = json_decode($task['files'], true) ?: [];
        }
        
        // Buscar y eliminar el archivo
        $file_found = false;
        $file_to_delete = null;
        foreach ($current_files as $index => $file) {
            if ($file['id'] === $file_id) {
                $file_to_delete = $file;
                unset($current_files[$index]);
                $file_found = true;
                break;
            }
        }
        
        if (!$file_found) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Archivo no encontrado']);
            return;
        }
        
        // Eliminar archivo físico
        if ($file_to_delete && file_exists('../../files/' . $file_to_delete['filename'])) {
            unlink('../../files/' . $file_to_delete['filename']);
        }
        
        // Actualizar la columna files en la base de datos
        $files_json = json_encode(array_values($current_files));
        $stmt = $conn->prepare("UPDATE tasks SET files = ? WHERE id = ?");
        $stmt->bind_param("si", $files_json, $task_id);
        $stmt->execute();
        
        echo json_encode([
            'success' => true,
            'message' => 'Archivo eliminado exitosamente'
        ]);
        
        $stmt->close();
        $conn->close();
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

/**
 * Maneja la descarga de archivos (GET con action=download)
 */
function handleFileDownload($task_id) {
    $file_id = isset($_GET['file_id']) ? $_GET['file_id'] : null;
    
    if (!$file_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'file_id es requerido']);
        return;
    }
    
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($conn->connect_error) {
            throw new Exception("Error de conexión: " . $conn->connect_error);
        }
        
        // Obtener archivos de la tarea
        $stmt = $conn->prepare("SELECT files FROM tasks WHERE id = ?");
        $stmt->bind_param("i", $task_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $task = $result->fetch_assoc();
        
        if (!$task) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Tarea no encontrada']);
            return;
        }
        
        $files = [];
        if (!empty($task['files'])) {
            $files = json_decode($task['files'], true) ?: [];
        }
        
        // Buscar el archivo específico
        $file_info = null;
        foreach ($files as $file) {
            if ($file['id'] === $file_id) {
                $file_info = $file;
                break;
            }
        }
        
        if (!$file_info) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Archivo no encontrado']);
            return;
        }
        
        // Verificar que el archivo existe físicamente
        $file_path = '../../files/' . $file_info['filename'];
        if (!file_exists($file_path)) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Archivo no encontrado en el servidor']);
            return;
        }
        
        // Configurar headers para descarga
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $file_info['name'] . '"');
        header('Content-Length: ' . filesize($file_path));
        header('Cache-Control: no-cache, must-revalidate');
        header('Expires: Sat, 26 Jul 1997 05:00:00 GMT');
        
        // Enviar archivo
        readfile($file_path);
        
        $stmt->close();
        $conn->close();
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

?>