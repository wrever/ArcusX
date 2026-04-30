<?php
/**
 * admin_common.php
 * Infraestructura compartida para el panel de administración
 * Maneja: CORS, autenticación, utilidades, configuración de errores
 */

// Función helper para obtener el origen permitido (desarrollo o producción)
function getAllowedOrigin() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowedOrigins = [
        'http://localhost:5173',  // Desarrollo local
        'https://arcusx.pro',      // Producción
    ];
    
    if (in_array($origin, $allowedOrigins)) {
        return $origin;
    }
    
    // Por defecto, usar producción
    return 'https://arcusx.pro';
}

/**
 * CRITICAL: Handle OPTIONS preflight FIRST, before ANY other code
 * This must be the absolute first thing executed
 */
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    $allowedOrigin = getAllowedOrigin();
    
    // Set CORS headers for preflight
    header('Access-Control-Allow-Origin: ' . $allowedOrigin, true);
    header('Access-Control-Allow-Credentials: true', true);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS', true);
    header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With', true);
    header('Access-Control-Max-Age: 3600', true);
    header('Content-Length: 0', true);
    header('Content-Type: text/plain', true);
    
    // Set HTTP 200 status
    http_response_code(200);
    
    // Exit immediately - do not execute any other code
    exit(0);
}

// Iniciar output buffering INMEDIATAMENTE después de OPTIONS
// Limpiar cualquier buffer anterior
while (ob_get_level() > 0) {
    ob_end_clean();
}
ob_start();

// Si llegamos aquí, no es OPTIONS, continuar con el código normal
// Configurar manejo de errores ANTES de cualquier otra cosa
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Asegurar que no se muestren errores en pantalla
ini_set('html_errors', 0);

// Función para enviar respuesta de error JSON (definir ANTES de usarla)
function sendErrorResponse($message, $code = 500, $error = null) {
    $allowedOrigin = getAllowedOrigin();
    
    // Headers CORS
    @header('Access-Control-Allow-Origin: ' . $allowedOrigin, true);
    @header('Access-Control-Allow-Credentials: true', true);
    @header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS', true);
    @header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With', true);
    @header('Content-Type: application/json', true);
    
    @http_response_code($code);
    $response = ['success' => false, 'message' => $message];
    if ($error !== null) {
        $response['error'] = $error;
    }
    
    // Limpiar output buffer antes de enviar
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    
    echo json_encode($response);
    exit();
}

// Configurar shutdown handler para errores fatales (ANTES de cargar dependencias)
// Este handler se ejecuta SIEMPRE al final, incluso si hay errores fatales
register_shutdown_function(function() {
    // No hacer nada si es OPTIONS (ya se manejó antes)
    if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        return;
    }
    
    $error = error_get_last();
    // Capturar TODOS los tipos de errores fatales y warnings críticos
    if ($error !== NULL && in_array($error['type'], [
        E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, 
        E_CORE_WARNING, E_COMPILE_WARNING, E_RECOVERABLE_ERROR
    ])) {
        // Log del error
        error_log('Fatal error captured in shutdown handler: ' . $error['message'] . ' in ' . $error['file'] . ':' . $error['line']);
        
        $allowedOrigin = getAllowedOrigin();
        
        // Headers CORS (usar @ para evitar errores si ya se enviaron)
        @header('Access-Control-Allow-Origin: ' . $allowedOrigin, true);
        @header('Access-Control-Allow-Credentials: true', true);
        @header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS', true);
        @header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With', true);
        @header('Content-Type: application/json', true);
        
        @http_response_code(500);
        $response = json_encode([
            'success' => false,
            'message' => 'Error fatal del servidor',
            'error' => $error['message'] . ' en ' . $error['file'] . ':' . $error['line'],
            'error_type' => $error['type']
        ]);
        
        // Asegurarse de que se envíe la respuesta
        echo $response;
        flush();
        exit();
    }
    
    // Si no hay error fatal pero la respuesta está vacía, devolver un error genérico
    $output = ob_get_contents();
    if (empty($output) && !headers_sent()) {
        $allowedOrigin = getAllowedOrigin();
        
        @header('Access-Control-Allow-Origin: ' . $allowedOrigin, true);
        @header('Access-Control-Allow-Credentials: true', true);
        @header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS', true);
        @header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With', true);
        @header('Content-Type: application/json', true);
        @http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error: Respuesta vacía del servidor',
            'error' => 'El servidor no devolvió ninguna respuesta'
        ]);
        flush();
    }
});

// Función para obtener Authorization header
// Simplificada y segura: primero $_SERVER['HTTP_AUTHORIZATION'], luego getallheaders()
function getAuthorizationHeader() {
    // Método 1: $_SERVER['HTTP_AUTHORIZATION'] (configurado por .htaccess)
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        error_log('Found Authorization in HTTP_AUTHORIZATION');
        return trim($_SERVER['HTTP_AUTHORIZATION']);
    }
    
    // Método 2: getallheaders() (fallback)
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if ($headers && isset($headers['Authorization'])) {
            error_log('Found Authorization in getallheaders');
            return trim($headers['Authorization']);
        }
    }
    
    // Log para debugging
    error_log('Authorization header not found');
    
    return null;
}

// Función para verificar si es admin
function isAdmin($conn, $userId) {
    try {
        if (!$conn || $conn->connect_error) {
            error_log('Database connection error in isAdmin: ' . ($conn ? $conn->connect_error : 'Connection is null'));
            return false;
        }
        
        $stmt = $conn->prepare("SELECT is_admin, role FROM users WHERE id = ?");
        if ($stmt === false) {
            error_log('Failed to prepare statement in isAdmin: ' . $conn->error);
            return false;
        }
        
        $stmt->bind_param("i", $userId);
        if (!$stmt->execute()) {
            error_log('Failed to execute statement in isAdmin: ' . $stmt->error);
            return false;
        }
        
        $result = $stmt->get_result();
        if ($result === false) {
            error_log('Failed to get result in isAdmin: ' . $stmt->error);
            return false;
        }
        
        if ($result->num_rows === 0) {
            error_log('User not found in isAdmin: ' . $userId);
            return false;
        }
        
        $user = $result->fetch_assoc();
        $isAdmin = ($user['is_admin'] == 1 || $user['role'] === 'admin');
        
        if (!$isAdmin) {
            error_log('User is not admin: ' . $userId . ' (is_admin=' . $user['is_admin'] . ', role=' . $user['role'] . ')');
        }
        
        return $isAdmin;
    } catch (Exception $e) {
        error_log('Exception in isAdmin: ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
        return false;
    } catch (Error $e) {
        error_log('Fatal error in isAdmin: ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
        return false;
    }
}

// Cargar archivos necesarios con manejo de errores robusto
try {
    if (!file_exists('config.php')) {
        error_log('config.php not found');
        sendErrorResponse('Archivo config.php no encontrado', 500);
    }
    
    // Capturar cualquier output de config.php
    ob_start();
    require_once 'config.php';
    $configOutput = ob_get_clean();
    
    if (!empty($configOutput)) {
        error_log('Unexpected output from config.php: ' . $configOutput);
    }
    
    // Verificar que la conexión se haya establecido correctamente
    if (!isset($conn)) {
        error_log('$conn variable not set after loading config.php');
        sendErrorResponse('Variable $conn no inicializada', 500, 'config.php no inicializó $conn');
    }
    
    if (!($conn instanceof mysqli)) {
        error_log('$conn is not a mysqli instance');
        sendErrorResponse('Error: $conn no es una instancia de mysqli', 500);
    }
    
    if ($conn->connect_error) {
        error_log('Database connection error: ' . $conn->connect_error);
        sendErrorResponse('Error de conexión a la base de datos', 500, $conn->connect_error);
    }
    
    if (!file_exists('vendor/autoload.php')) {
        error_log('vendor/autoload.php not found');
        sendErrorResponse('Archivo vendor/autoload.php no encontrado. Ejecuta: composer install', 500);
    }
    
    ob_start();
    require_once 'vendor/autoload.php';
    $vendorOutput = ob_get_clean();
    
    if (!empty($vendorOutput)) {
        error_log('Unexpected output from vendor/autoload.php: ' . $vendorOutput);
    }
} catch (Exception $e) {
    error_log('Exception en admin_common.php al cargar archivos: ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
    error_log('Stack trace: ' . $e->getTraceAsString());
    sendErrorResponse('Error al cargar archivos necesarios', 500, $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
} catch (Error $e) {
    error_log('Fatal Error en admin_common.php al cargar archivos: ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
    error_log('Stack trace: ' . $e->getTraceAsString());
    sendErrorResponse('Error fatal al cargar archivos necesarios', 500, $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
} catch (Throwable $e) {
    error_log('Throwable en admin_common.php al cargar archivos: ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
    error_log('Stack trace: ' . $e->getTraceAsString());
    sendErrorResponse('Error inesperado al cargar archivos necesarios', 500, $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
}

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// Función para obtener usuario del JWT - SIMPLIFICADA (igual que login.php)
// IMPORTANTE: Esta función debe estar DESPUÉS de cargar las dependencias de Firebase JWT
function getLoggedInUser($conn, $jwt_secret) {
    try {
        $authHeader = getAuthorizationHeader();
        if (!$authHeader) {
            return null;
        }
        
        if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            return null;
        }
        
        $token = $matches[1];
        
        if (empty($jwt_secret)) {
            return null;
        }
        
        // Usar Firebase JWT para validar el token - mismo método que login.php
        \Firebase\JWT\JWT::$leeway = 300; // 5 minutos de tolerancia
        
        try {
            $decoded = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key($jwt_secret, 'HS256'));
        } catch (\Firebase\JWT\ExpiredException $e) {
            error_log('JWT Expired: ' . $e->getMessage());
            return null;
        } catch (\Firebase\JWT\SignatureInvalidException $e) {
            error_log('JWT Signature Invalid: ' . $e->getMessage());
            return null;
        } catch (\Exception $e) {
            error_log('JWT Decode Error: ' . $e->getMessage() . ' - Class: ' . get_class($e));
            return null;
        }
        
        // Convertir a array
        $decodedArray = json_decode(json_encode($decoded), true);
        
        if (!isset($decodedArray['data']['id'])) {
            return null;
        }
        
        return $decodedArray['data'];
    } catch (\Exception $e) {
        error_log('Exception in getLoggedInUser: ' . $e->getMessage() . ' - File: ' . $e->getFile() . ':' . $e->getLine());
        return null;
    } catch (\Error $e) {
        error_log('Fatal Error in getLoggedInUser: ' . $e->getMessage() . ' - File: ' . $e->getFile() . ':' . $e->getLine());
        return null;
    } catch (\Throwable $e) {
        error_log('Throwable in getLoggedInUser: ' . $e->getMessage() . ' - File: ' . $e->getFile() . ':' . $e->getLine());
        return null;
    }
}

// Función para requerir admin
function requireAdmin($conn, $userId) {
    if (!isAdmin($conn, $userId)) {
        sendErrorResponse('Acceso denegado. Se requieren permisos de administrador.', 403);
    }
}

// Función para registrar acciones de admin
function logAdminAction($conn, $adminId, $action, $targetType = null, $targetId = null, $details = null) {
    // Verificar si la tabla admin_logs existe antes de intentar insertar
    $checkTable = $conn->query("SHOW TABLES LIKE 'admin_logs'");
    if ($checkTable->num_rows === 0) {
        // Si la tabla no existe, no hacer nada (no crítico)
        return;
    }
    
    try {
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
        
        $stmt = $conn->prepare("INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)");
        if ($stmt === false) {
            // Si falla la preparación, no hacer nada (no crítico)
            return;
        }
        
        $detailsJson = $details ? json_encode($details) : null;
        $stmt->bind_param("ississs", $adminId, $action, $targetType, $targetId, $detailsJson, $ipAddress, $userAgent);
        $stmt->execute();
    } catch (Exception $e) {
        // Si falla el log, no hacer nada (no crítico para la operación principal)
        error_log('Error logging admin action: ' . $e->getMessage());
    }
}

// Headers CORS para peticiones normales (no OPTIONS)
// IMPORTANTE: Estos headers deben estar ANTES de la autenticación
// para evitar problemas con el navegador
$allowedOrigin = getAllowedOrigin();
header('Access-Control-Allow-Origin: ' . $allowedOrigin, true);
header('Access-Control-Allow-Credentials: true', true);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS', true);
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With', true);
header('Access-Control-Max-Age: 3600', true);
header('Content-Type: application/json', true);

// Obtener usuario logueado
try {
    // Verificar que $jwt_secret esté definido
    if (!isset($jwt_secret) || empty($jwt_secret)) {
        error_log('JWT secret not defined in config.php');
        sendErrorResponse('Error de configuración: JWT secret no definido', 500);
    }
    
    $jwt_secret = trim($jwt_secret);
    
    $user = getLoggedInUser($conn, $jwt_secret);
    
    if (!$user) {
        error_log('User authentication failed - no user returned from getLoggedInUser');
        error_log('Available $_SERVER keys: ' . implode(', ', array_keys($_SERVER)));
        error_log('HTTP_AUTHORIZATION: ' . (isset($_SERVER['HTTP_AUTHORIZATION']) ? 'SET' : 'NOT SET'));
        
        // Error simple - token no válido
        sendErrorResponse('No autorizado. Token JWT requerido o inválido.', 401);
    }
    
    // Verificar que sea admin
    requireAdmin($conn, $user['id']);
} catch (Exception $e) {
    error_log('Exception in authentication: ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
    sendErrorResponse('Error en autenticación', 500, $e->getMessage());
} catch (Error $e) {
    error_log('Fatal error in authentication: ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
    sendErrorResponse('Error fatal en autenticación', 500, $e->getMessage());
}

// Al final de admin_common.php, las variables $conn, $user y $jwt_secret están disponibles
// para ser usadas en admin.php

