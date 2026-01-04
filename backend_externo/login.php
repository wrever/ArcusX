<?php
/**
 * login.php
 * Endpoint para autenticación de usuarios
 */

// Deshabilitar display_errors para evitar output antes de headers
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

// Iniciar output buffering para capturar cualquier output inesperado
ob_start();

// CORS headers - DEBEN IR PRIMERO, ANTES DE CUALQUIER OTRO OUTPUT
$allowed_origins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://arcusx.pro',
    'http://arcusx.pro'
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

// Manejar preflight OPTIONS request PRIMERO
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Limpiar cualquier output previo
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    }
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 3600");
    http_response_code(200);
    exit();
}

// Headers CORS para requests normales
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Limpiar buffer antes de require
ob_end_clean();

require_once 'config.php';

// Verificar si el archivo autoload.php existe y es legible
$autoload_path = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoload_path)) {
    // Si no se encuentra, muestra un error claro
    http_response_code(500); // O 501 Not Implemented si quieres ser específico sobre la dependencia
    echo json_encode([
        'message' => 'Error en el servidor: Falta la carpeta de dependencias (vendor).',
        'details' => 'El archivo ' . $autoload_path . ' no fue encontrado. Asegúrate de haber instalado Composer y subido la carpeta vendor a este directorio.'
    ]);
    exit(); // Detener la ejecución si autoload.php no existe
}

require $autoload_path; // Ahora requerimos el archivo si existe

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// Definir una clave secreta fuerte para firmar tus tokens
// ¡Cambia esto por una cadena aleatoria y segura en producción!
$secret_key = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY"; // !! IMPORTANTE: CAMBIA ESTO !!

// Configuración del token (opcional, ajusta según necesites)
$issuedAt = time(); // Tiempo en que el token fue emitido
$expirationTime = $issuedAt + (3600 * 24); // Tiempo de expiración (ej: 1 día)
$issuer = "arcusx.pro"; // Tu dominio o emisor

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $raw_data = file_get_contents('php://input');
    // error_log('Datos recibidos: ' . $raw_data); // Puedes usar esto si tienes acceso a los logs de error de PHP en cPanel

    $data = json_decode($raw_data, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['message' => 'Error al decodificar JSON: ' . json_last_error_msg()]);
        exit();
    }


    if (!isset($data['email'], $data['password'])) {
         http_response_code(400);
         echo json_encode(['message' => 'Faltan email o password.']);
         exit();
    }

    $email = $data['email'];
    $password = $data['password'];

    // Consulta preparada para obtener usuario por email (¡Seguro!)
    // Asegúrate de que $conn es accesible aquí (definido en config.php)
    if (!isset($conn) || $conn->connect_error) {
         http_response_code(500);
         echo json_encode(['message' => 'Error de conexión a la base de datos.']);
         exit();
    }

    $stmt = $conn->prepare("SELECT id, username, email, password FROM users WHERE email = ?");

    if ($stmt === false) {
        // Manejar error en la preparación de la consulta
        http_response_code(500);
        echo json_encode(['message' => 'Error interno al preparar la consulta SQL.', 'error' => $conn->error]);
        exit();
    }


    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();

        // Verificar la contraseña hasheada
        if (password_verify($password, $user['password'])) {

            // Payload del token JWT
            $payload = [
                'iat' => $issuedAt, // Issued at: time when the token was generated
                'exp' => $expirationTime, // Expire
                'iss' => $issuer, // Issuer
                'data' => [ // Información del usuario (¡no pongas datos sensibles como la contraseña!)
                    'id' => $user['id'], // Incluimos el ID del usuario
                    'username' => $user['username'], // Incluimos el username
                    // Puedes añadir otros datos NO sensibles aquí si los necesitas en el frontend
                ]
            ];

            // Generar el token JWT
            // Asegúrate de usar 'HS256' o el algoritmo que prefieras y soporta tu librería
            // Asegúrate de que $secret_key es accesible aquí
            if (!isset($secret_key)) {
                 http_response_code(500);
                 echo json_encode(['message' => 'Error interno: Clave secreta JWT no definida.']);
                 exit();
            }
            $jwt = JWT::encode($payload, $secret_key, 'HS256');

            // Devolver el token JWT y la información básica del usuario en la respuesta
            http_response_code(200);
            echo json_encode([
                'message' => 'Login exitoso',
                'token' => $jwt, // ¡Ahora devolvemos el JWT válido!
                // Opcional: devolver info básica del user si es necesaria inmediatamente después del login
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username']
                ]
            ]);

        } else {
            // Contraseña incorrecta
            http_response_code(401);
            echo json_encode(['message' => 'Credenciales incorrectas.']);
        }
    } else {
        // Usuario no encontrado (o más de uno, aunque la consulta debería evitarlo)
        http_response_code(401);
        echo json_encode(['message' => 'Credenciales incorrectas.']);
    }

    // Cerrar el statement y la conexión a la base de datos
    $stmt->close();
    $conn->close();

} else {
    // Si la solicitud no es POST, devolver método no permitido
    http_response_code(405);
    echo json_encode(['message' => 'Método no permitido.']);
}
?>