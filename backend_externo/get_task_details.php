<?php
// get_task_details.php
// Obtiene detalles de una tarea y maneja operaciones de archivos

require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('GET, POST, DELETE, OPTIONS');
arcusx_cors_apply('GET, POST, DELETE, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

// Habilitar logs (pero NO mostrar errores en pantalla para evitar output antes de headers)
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

require_once __DIR__ . '/config.php';

try {
    // Verificar métodos permitidos
    if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST', 'DELETE'])) {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido. Solo se permite GET, POST, DELETE.'], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // Obtener el task_id de los parámetros GET
    $task_id = isset($_GET['task_id']) ? intval($_GET['task_id']) : null;

    if (!$task_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'task_id es requerido'], JSON_UNESCAPED_UNICODE);
        exit();
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

} catch (Exception $e) {
    error_log('Error en get_task_details.php: ' . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error al procesar solicitud',
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * Maneja la obtención de detalles de la tarea
 */
function handleGetTaskDetails($task_id) {
    global $conn;
    
    try {
        // Usar la conexión global de config.php (igual que get_tasks.php)
        if (!isset($conn) || $conn->connect_error) {
            throw new Exception("Error de conexión: " . ($conn->connect_error ?? "Conexión no disponible"));
        }

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
        if (!$stmt) {
            throw new Exception("Error al preparar consulta: " . $conn->error);
        }
        
        $stmt->bind_param("i", $task_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Tarea no encontrada'], JSON_UNESCAPED_UNICODE);
            $stmt->close();
            $conn->close();
            return;
        }
        
        $task = $result->fetch_assoc();
        $stmt->close();

        // Corregir tildes/mojibake en campos de texto
        $textKeys = ['title', 'subtitle', 'description', 'category', 'difficulty', 'currency', 'creator_username'];
        foreach ($textKeys as $k) {
            if (isset($task[$k]) && is_string($task[$k])) {
                $task[$k] = fix_utf8_mojibake($task[$k]);
            }
        }
        
        // Verificar que user_id no sea null
        if ($task['user_id'] === null || $task['user_id'] === '') {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error: user_id no encontrado en la tarea'], JSON_UNESCAPED_UNICODE);
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
            if ($stmt_wallet) {
                $stmt_wallet->bind_param("ii", $task['accepted_applicant_id'], $task_id);
                $stmt_wallet->execute();
                $result_wallet = $stmt_wallet->get_result();
                
                if ($result_wallet->num_rows > 0) {
                    $wallet_data = $result_wallet->fetch_assoc();
                    $worker_wallet_address = $wallet_data['worker_wallet_address'] ?? null;
                }
                $stmt_wallet->close();
            }
            
            // Si no está en applications, obtener desde users como fallback
            if (empty($worker_wallet_address)) {
                $sql_user = "SELECT username, wallet_address FROM users WHERE id = ? LIMIT 1";
                $stmt_user = $conn->prepare($sql_user);
                if ($stmt_user) {
                    $stmt_user->bind_param("i", $task['accepted_applicant_id']);
                    $stmt_user->execute();
                    $result_user = $stmt_user->get_result();
                    
                    if ($result_user->num_rows > 0) {
                        $user_data = $result_user->fetch_assoc();
                        $worker_wallet_address = $user_data['wallet_address'] ?? null;
                        $worker_username = isset($user_data['username']) ? fix_utf8_mojibake($user_data['username']) : null;
                    }
                    $stmt_user->close();
                }
            } else {
                // Si tenemos wallet desde applications, obtener username desde users
                $sql_username = "SELECT username FROM users WHERE id = ? LIMIT 1";
                $stmt_username = $conn->prepare($sql_username);
                if ($stmt_username) {
                    $stmt_username->bind_param("i", $task['accepted_applicant_id']);
                    $stmt_username->execute();
                    $result_username = $stmt_username->get_result();
                    
                    if ($result_username->num_rows > 0) {
                        $username_data = $result_username->fetch_assoc();
                        $worker_username = isset($username_data['username']) ? fix_utf8_mojibake($username_data['username']) : null;
                    }
                    $stmt_username->close();
                }
            }
        }
        
        // Preparar respuesta
        $response = [
            'success' => true,
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
            'worker_wallet_address' => $worker_wallet_address,
            'worker_username' => $worker_username,
            'can_mark_completed' => $can_mark_completed
        ];

        http_response_code(200);
        echo json_encode($response, JSON_UNESCAPED_UNICODE);

        $conn->close();

    } catch (Exception $e) {
        error_log('Error en handleGetTaskDetails: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error interno del servidor: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * Maneja la subida de archivos
 */
function handleFileUpload($task_id) {
    global $conn;
    
    // Verificar que se envió un archivo
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No se envió archivo válido'], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    $file = $_FILES['file'];
    
    // Validar tamaño del archivo (máximo 10MB)
    $max_size = 10 * 1024 * 1024; // 10MB
    if ($file['size'] > $max_size) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El archivo es demasiado grande. Máximo 10MB'], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    try {
        // Usar la conexión global de config.php
        if (!isset($conn) || $conn->connect_error) {
            throw new Exception("Error de conexión: " . ($conn->connect_error ?? "Conexión no disponible"));
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
        if (!$stmt) {
            throw new Exception("Error al preparar consulta: " . $conn->error);
        }
        
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
        if (!$stmt) {
            throw new Exception("Error al preparar consulta de actualización: " . $conn->error);
        }
        
        $stmt->bind_param("si", $files_json, $task_id);
        $stmt->execute();
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Archivo subido exitosamente',
            'file' => $new_file
        ], JSON_UNESCAPED_UNICODE);
        
        $stmt->close();
        $conn->close();
        
    } catch (Exception $e) {
        // Eliminar archivo si falla la inserción en BD
        if (isset($file_path) && file_exists($file_path)) {
            unlink($file_path);
        }
        
        error_log('Error en handleFileUpload: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * Maneja la eliminación de archivos
 */
function handleFileDelete($task_id) {
    global $conn;
    
    // Obtener datos del cuerpo de la petición
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['file_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'file_id es requerido'], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    $file_id = $input['file_id'];
    
    try {
        // Usar la conexión global de config.php
        if (!isset($conn) || $conn->connect_error) {
            throw new Exception("Error de conexión: " . ($conn->connect_error ?? "Conexión no disponible"));
        }
        
        // Obtener archivos actuales de la tarea
        $stmt = $conn->prepare("SELECT files FROM tasks WHERE id = ?");
        if (!$stmt) {
            throw new Exception("Error al preparar consulta: " . $conn->error);
        }
        
        $stmt->bind_param("i", $task_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $task = $result->fetch_assoc();
        
        if (!$task) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Tarea no encontrada'], JSON_UNESCAPED_UNICODE);
            $stmt->close();
            $conn->close();
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
            echo json_encode(['success' => false, 'message' => 'Archivo no encontrado'], JSON_UNESCAPED_UNICODE);
            $stmt->close();
            $conn->close();
            return;
        }
        
        // Eliminar archivo físico
        if ($file_to_delete && file_exists('../../files/' . $file_to_delete['filename'])) {
            unlink('../../files/' . $file_to_delete['filename']);
        }
        
        // Actualizar la columna files en la base de datos
        $files_json = json_encode(array_values($current_files));
        $stmt = $conn->prepare("UPDATE tasks SET files = ? WHERE id = ?");
        if (!$stmt) {
            throw new Exception("Error al preparar consulta de actualización: " . $conn->error);
        }
        
        $stmt->bind_param("si", $files_json, $task_id);
        $stmt->execute();
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Archivo eliminado exitosamente'
        ], JSON_UNESCAPED_UNICODE);
        
        $stmt->close();
        $conn->close();
        
    } catch (Exception $e) {
        error_log('Error en handleFileDelete: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * Maneja la descarga de archivos (GET con action=download)
 */
function handleFileDownload($task_id) {
    global $conn;
    
    $file_id = isset($_GET['file_id']) ? $_GET['file_id'] : null;
    
    if (!$file_id) {
        header("Content-Type: application/json; charset=UTF-8");

        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'file_id es requerido'], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    try {
        // Usar la conexión global de config.php
        if (!isset($conn) || $conn->connect_error) {
            throw new Exception("Error de conexión: " . ($conn->connect_error ?? "Conexión no disponible"));
        }
        
        // Obtener archivos de la tarea
        $stmt = $conn->prepare("SELECT files FROM tasks WHERE id = ?");
        if (!$stmt) {
            throw new Exception("Error al preparar consulta: " . $conn->error);
        }
        
        $stmt->bind_param("i", $task_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $task = $result->fetch_assoc();
        
        if (!$task) {
            header("Content-Type: application/json; charset=UTF-8");

            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Tarea no encontrada'], JSON_UNESCAPED_UNICODE);
            $stmt->close();
            $conn->close();
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
            header("Content-Type: application/json; charset=UTF-8");

            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Archivo no encontrado'], JSON_UNESCAPED_UNICODE);
            $stmt->close();
            $conn->close();
            return;
        }
        
        // Verificar que el archivo existe físicamente
        $file_path = '../../files/' . $file_info['filename'];
        if (!file_exists($file_path)) {
            header("Content-Type: application/json; charset=UTF-8");

            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Archivo no encontrado en el servidor'], JSON_UNESCAPED_UNICODE);
            $stmt->close();
            $conn->close();
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
        error_log('Error en handleFileDownload: ' . $e->getMessage());
        
        header("Content-Type: application/json; charset=UTF-8");

        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

?>
