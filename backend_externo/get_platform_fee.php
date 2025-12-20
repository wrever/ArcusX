<?php
/**
 * get_platform_fee.php
 * Endpoint para obtener el platform fee configurado
 * GET /api/auth/get_platform_fee.php
 * Headers: Authorization: Bearer {JWT_TOKEN} (opcional)
 */

require_once 'config.php';

$autoload_path = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoload_path)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en el servidor: Falta la carpeta de dependencias (vendor).'
    ]);
    exit();
}
require $autoload_path;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// Headers CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$jwt_secret = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY";

/**
 * Obtener el ID del usuario autenticado desde el JWT (opcional, para logging)
 */
function getLoggedInUserId($secret_key) {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    // También verificar $_SERVER por si getallheaders() no funciona
    if (empty($authHeader) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }
    
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $jwt = $matches[1];
        try {
            JWT::$leeway = 300;
            $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));
            if (isset($decoded->data->id)) {
                return (int)$decoded->data->id;
            }
        } catch (Exception $e) {
            error_log("JWT error en get_platform_fee.php: " . $e->getMessage());
            return null;
        }
    }
    return null;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Obtener platform fee de la tabla system_config
        $platformFee = 0.003; // Valor por defecto (0.3%)
        
        // Verificar si la tabla system_config existe
        $checkTable = $conn->query("SHOW TABLES LIKE 'system_config'");
        if ($checkTable !== false && $checkTable->num_rows > 0) {
            // Intentar obtener el platform fee configurado
            $feeResult = $conn->query("SELECT config_value FROM system_config WHERE config_key = 'platform_fee'");
            if ($feeResult !== false && $feeResult->num_rows > 0) {
                $feeRow = $feeResult->fetch_assoc();
                $feeValue = $feeRow['config_value'];
                
                // Convertir a float si es string numérico
                if (is_numeric($feeValue)) {
                    $platformFee = (float)$feeValue;
                } else {
                    // Intentar parsear JSON si es necesario
                    $decoded = json_decode($feeValue, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_numeric($decoded)) {
                        $platformFee = (float)$decoded;
                    }
                }
            }
        }
        
        // Retornar el platform fee
        echo json_encode([
            'success' => true,
            'platform_fee' => $platformFee,
            'platform_fee_percent' => round($platformFee * 100, 2)
        ]);
        
    } catch (Exception $e) {
        error_log("Error en get_platform_fee.php: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al obtener platform fee',
            'platform_fee' => 0.003 // Retornar valor por defecto en caso de error
        ]);
    } finally {
        if (isset($conn)) {
            $conn->close();
        }
    }
    exit();
}

// Si no es GET, retornar error
http_response_code(405);
echo json_encode([
    'success' => false,
    'message' => 'Método no permitido. Use GET.'
]);
exit();

