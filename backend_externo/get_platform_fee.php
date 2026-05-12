<?php
/**
 * get_platform_fee.php
 * Endpoint para obtener el platform fee configurado
 * GET /api/auth/get_platform_fee.php
 * Headers: Authorization: Bearer {JWT_TOKEN} (opcional)
 */

require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('GET, OPTIONS');
require_once 'config.php';

arcusx_cors_apply('GET, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

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

