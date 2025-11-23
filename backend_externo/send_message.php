<?php
// send_message.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once 'config.php';

// Manejar preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Obtener datos del POST
    $data = json_decode(file_get_contents("php://input"), true);

    // Log para depuración
    // error_log("Datos recibidos en send_message.php: " . print_r($data, true)); // Descomentar para depurar si es necesario

    // Validar que todos los campos requeridos estén presentes
    $required_fields = ['task_id', 'sender_id', 'receiver_id', 'message'];
    $missing_fields = [];

    foreach ($required_fields as $field) {
        // Verificar si la clave existe y el valor no es null o cadena vacía después de trim
        if (!isset($data[$field]) || $data[$field] === null || trim($data[$field]) === '') {
            $missing_fields[] = $field;
        }
    }

    if (!empty($missing_fields)) {
        http_response_code(400);
        echo json_encode([
            'success' => false, // Indicamos fallo
            'message' => 'Faltan datos requeridos',
            'missing_fields' => $missing_fields,
            // 'received_data' => $data // Puedes incluir esto para depurar
        ]);
        exit;
    }

    // Validar que los IDs sean números
    // is_numeric() verifica si una variable es un número o una cadena numérica
    if (!is_numeric($data['task_id']) || !is_numeric($data['sender_id']) ||
        !is_numeric($data['receiver_id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false, // Indicamos fallo
            'message' => 'Los IDs deben ser números',
            // 'received_data' => $data // Puedes incluir esto para depurar
        ]);
        exit;
    }

    // Sanitizar y validar los datos
    // intval convierte a entero. Si la cadena no es numérica, puede dar 0, lo cual podría ser un problema si 0 es un ID válido.
    // is_numeric() ya verificó que son cadenas numéricas, así que intval es seguro aquí.
    $task_id = intval($data['task_id']);
    $sender_id = intval($data['sender_id']);
    $receiver_id = intval($data['receiver_id']);
    // Usar consultas preparadas es más seguro que real_escape_string
    $message = trim($data['message']);


    // Validar que el mensaje no esté vacío (trim() ya se hizo arriba)
    if (empty($message)) {
        http_response_code(400);
        echo json_encode([
            'success' => false, // Indicamos fallo
            'message' => 'El mensaje no puede estar vacío'
        ]);
        exit;
    }

    // Validar que la tarea exista usando consulta preparada
    // Asegúrate de que $conn es accesible aquí (definido en config.php)
    if (!isset($conn) || $conn->connect_error) {
         http_response_code(500);
         echo json_encode(['success' => false, 'message' => 'Error de conexión a la base de datos.']);
         exit();
    }

    $stmt_check_task = $conn->prepare("SELECT id FROM tasks WHERE id = ?");
    if ($stmt_check_task === false) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error interno al preparar la consulta de verificación de tarea.', 'error' => $conn->error]);
        exit();
    }
    $stmt_check_task->bind_param("i", $task_id); // "i" para entero
    $stmt_check_task->execute();
    $result_check_task = $stmt_check_task->get_result();

    if ($result_check_task->num_rows === 0) {
        http_response_code(404);
        echo json_encode([
            'success' => false, // Indicamos fallo
            'message' => 'La tarea no existe'
        ]);
        $stmt_check_task->close();
        exit;
    }
    $stmt_check_task->close();


    // Insertar el mensaje usando consulta preparada (¡Más seguro!)
    $sql_insert = "INSERT INTO messages (task_id, sender_id, receiver_id, message) VALUES (?, ?, ?, ?)";
    $stmt_insert = $conn->prepare($sql_insert);

     if ($stmt_insert === false) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error interno al preparar la consulta de inserción.', 'error' => $conn->error, 'sql' => $sql_insert]);
        exit();
    }

    $stmt_insert->bind_param("iiis", $task_id, $sender_id, $receiver_id, $message); // "iiis" para 3 enteros y 1 string

    if ($stmt_insert->execute()) {
        http_response_code(201);
        echo json_encode([
            'success' => true, // <-- ¡Añadido! Indica éxito al frontend
            'message' => 'Mensaje enviado correctamente',
            'message_id' => $conn->insert_id // ID del mensaje recién insertado
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false, // Indicamos fallo
            'message' => 'Error al enviar mensaje',
            'error' => $stmt_insert->error, // Usar el error del statement preparado
            'sql' => $sql_insert
        ]);
    }

    $stmt_insert->close();
    $conn->close();

} else {
    http_response_code(405);
    echo json_encode([
        'success' => false, // Indicamos fallo para métodos no permitidos
        'message' => 'Método no permitido'
    ]);
}
?>