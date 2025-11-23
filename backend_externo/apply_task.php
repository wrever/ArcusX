<?php
require_once 'config.php'; // Incluye la configuración de la base de datos

// Headers CORS
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Manejar peticiones OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Asegurarse de que la solicitud es POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Obtener los datos JSON enviados por el frontend
    $data = json_decode(file_get_contents('php://input'), true);

    // Validar si se recibieron los campos necesarios
    $missing_fields = [];
    if (!isset($data['taskId'])) $missing_fields[] = 'taskId';
    if (!isset($data['applicantId'])) $missing_fields[] = 'applicantId';
    if (!isset($data['message'])) $missing_fields[] = 'message';
    if (!isset($data['walletAddress'])) $missing_fields[] = 'walletAddress';
    
    if (!empty($missing_fields)) {
        http_response_code(400); // Bad Request
        error_log("Campos faltantes: " . implode(', ', $missing_fields));
        error_log("Datos recibidos: " . json_encode($data));
        echo json_encode([
            'message' => 'Faltan campos obligatorios: ' . implode(', ', $missing_fields),
            'received_data' => $data
        ]);
        exit;
    }

    // Sanitizar los datos
    $taskId = intval($data['taskId']);
    $applicantId = intval($data['applicantId']);
    $message = $conn->real_escape_string($data['message']);
    
    // Validar formato de dirección Stellar ANTES de sanitizar
    $walletAddress_raw = trim($data['walletAddress']);
    
    // Log para debugging
    error_log("=== VALIDACIÓN DE DIRECCIÓN STELLAR ===");
    error_log("Dirección recibida: " . $walletAddress_raw);
    error_log("Longitud: " . strlen($walletAddress_raw));
    error_log("Primer carácter: " . substr($walletAddress_raw, 0, 1));
    
    // Validación básica: debe empezar con G y tener 56 caracteres
    if (empty($walletAddress_raw)) {
        http_response_code(400);
        echo json_encode(['message' => 'La dirección de wallet no puede estar vacía.']);
        exit;
    }
    
    // Validar longitud (56 caracteres)
    $address_length = strlen($walletAddress_raw);
    if ($address_length !== 56) {
        http_response_code(400);
        error_log("ERROR: Longitud incorrecta - Recibido: $address_length, Esperado: 56");
        echo json_encode([
            'message' => "La dirección de wallet Stellar debe tener exactamente 56 caracteres. Longitud recibida: $address_length",
            'received_address' => $walletAddress_raw,
            'address_length' => $address_length,
            'expected_length' => 56
        ]);
        exit;
    }
    
    // Validar que empiece con G
    $first_char = substr($walletAddress_raw, 0, 1);
    if ($first_char !== 'G') {
        http_response_code(400);
        error_log("ERROR: No empieza con G - Primer carácter: $first_char");
        echo json_encode([
            'message' => "La dirección de wallet Stellar debe empezar con la letra G. Primer carácter recibido: $first_char",
            'received_address' => $walletAddress_raw,
            'first_char' => $first_char
        ]);
        exit;
    }
    
    // Validar que contenga solo caracteres alfanuméricos (A-Z, 0-9) - MÁS PERMISIVO
    // Permitir cualquier carácter alfanumérico después de G
    if (!preg_match('/^G[A-Z0-9]{55}$/i', $walletAddress_raw)) {
        // Intentar con mayúsculas forzadas
        $uppercase_address = strtoupper($walletAddress_raw);
        if (preg_match('/^G[A-Z0-9]{55}$/', $uppercase_address)) {
            // La dirección es válida pero tiene minúsculas, usar la versión en mayúsculas
            $walletAddress_raw = $uppercase_address;
            error_log("Dirección convertida a mayúsculas: $walletAddress_raw");
        } else {
            http_response_code(400);
            error_log("ERROR: Caracteres inválidos en dirección Stellar");
            // Verificar qué caracteres son inválidos
            $invalid_chars = preg_replace('/[A-Z0-9]/i', '', substr($walletAddress_raw, 1));
            echo json_encode([
                'message' => 'La dirección de wallet Stellar contiene caracteres inválidos. Solo se permiten letras y números.',
                'received_address' => $walletAddress_raw,
                'invalid_chars' => $invalid_chars ?: 'ninguno detectado',
                'address_length' => $address_length,
                'first_char' => $first_char
            ]);
            exit;
        }
    }
    
    error_log("✓ Dirección Stellar válida: $walletAddress_raw");
    
    // Ahora sanitizar después de validar
    $walletAddress = $conn->real_escape_string($walletAddress_raw);
    
    // Sanitizar y obtener el campo portfolioUrl si existe, si no, será NULL en la DB
    $portfolioUrl = isset($data['portfolioUrl']) && !empty($data['portfolioUrl']) ? $conn->real_escape_string($data['portfolioUrl']) : NULL;

    // Validar si la tarea existe
    $check_task = $conn->query("SELECT id, user_id FROM tasks WHERE id = $taskId");
    if ($check_task->num_rows === 0) {
        http_response_code(404); // Not Found
        echo json_encode(['message' => 'La tarea a la que intentas aplicar no existe.']);
        exit;
    }
    
    $task_data = $check_task->fetch_assoc();
    
    // Validar que el aplicante no sea el creador de la tarea
    if ($task_data['user_id'] == $applicantId) {
        http_response_code(400);
        echo json_encode(['message' => 'No puedes aplicar a tu propia tarea.']);
        exit;
    }

    // Validar si el aplicante existe
    $check_applicant = $conn->query("SELECT id FROM users WHERE id = $applicantId");
    if ($check_applicant->num_rows === 0) {
        http_response_code(404); // Not Found
        echo json_encode(['message' => 'El usuario aplicante no existe.']);
        exit;
    }

    // Validar que no haya aplicado previamente a esta tarea
    $check_application = $conn->query("SELECT id FROM applications WHERE task_id = $taskId AND applicant_id = $applicantId");
    if ($check_application->num_rows > 0) {
        http_response_code(409); // Conflict
        echo json_encode(['message' => 'Ya has aplicado a esta tarea anteriormente.']);
        exit;
    }

    // Preparar la consulta SQL usando prepared statements
    $stmt = $conn->prepare("INSERT INTO applications (task_id, applicant_id, message, portfolio_url, worker_wallet_address) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("iisss", $taskId, $applicantId, $message, $portfolioUrl, $walletAddress);

    // Ejecutar la consulta
    if ($stmt->execute()) {
        // Éxito: devolver un mensaje de confirmación
        http_response_code(201); // Created
        echo json_encode(['message' => 'Aplicación enviada exitosamente.', 'application_id' => $conn->insert_id]);
    } else {
        // Error en la inserción
        http_response_code(500); // Internal Server Error
        error_log("Error al insertar aplicación: " . $stmt->error);
        echo json_encode(['message' => 'Error al enviar la aplicación.']);
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