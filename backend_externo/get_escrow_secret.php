<?php
/**
 * DEPRECATED: Este endpoint ya no se usa.
 * El sistema ahora usa exclusivamente Trustless Work para manejar escrows.
 * Trustless Work no usa secret keys - usa contract IDs.
 * 
 * Este archivo se mantiene solo para referencia histórica.
 * 
 * @deprecated Desde la migración a Trustless Work
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';
require_once 'vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$secret_key = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY";

function getLoggedInUserId($conn, $secret_key) {
    $headers = getallheaders();
    if (!isset($headers['Authorization'])) {
        return null;
    }

    $authHeader = $headers['Authorization'];
    if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        return null;
    }

    $jwt = $matches[1];

    try {
        $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));
        if (isset($decoded->data->id)) {
            return (string) $decoded->data->id;
        }
        return null;
    } catch (Exception $e) {
        error_log("JWT Error in get_escrow_secret.php: " . $e->getMessage());
        return null;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $loggedInUserId = getLoggedInUserId($conn, $secret_key);

    if (is_null($loggedInUserId)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Acceso no autorizado']);
        exit;
    }

    if (!isset($_GET['task_id']) || !is_numeric($_GET['task_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'task_id requerido']);
        exit;
    }

    // Este endpoint está deprecado - Trustless Work no usa secret keys
    http_response_code(410); // Gone
    echo json_encode([
        'success' => false, 
        'message' => 'Este endpoint está deprecado. El sistema ahora usa exclusivamente Trustless Work, que no requiere secret keys.'
    ]);
    exit;

    } catch (Exception $e) {
        error_log('Error en get_escrow_secret.php: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }

    $conn->close();
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}
?>

