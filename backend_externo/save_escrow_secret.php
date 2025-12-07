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
header("Access-Control-Allow-Methods: POST, OPTIONS");
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
        error_log("JWT Error in save_escrow_secret.php: " . $e->getMessage());
        return null;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $loggedInUserId = getLoggedInUserId($conn, $secret_key);

    if (is_null($loggedInUserId)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Acceso no autorizado']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['task_id']) || !is_numeric($data['task_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'task_id requerido']);
        exit;
    }

    if (!isset($data['escrow_secret']) || empty($data['escrow_secret'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'escrow_secret requerido']);
        exit;
    }

    $taskId = intval($data['task_id']);
    $escrowSecret = $data['escrow_secret'];

    // Este endpoint está deprecado - Trustless Work no usa secret keys
    http_response_code(410); // Gone
    echo json_encode([
        'success' => false, 
        'message' => 'Este endpoint está deprecado. El sistema ahora usa exclusivamente Trustless Work, que no requiere secret keys.'
    ]);
    exit;


        // Guardar el secret encriptado (en producción, usar encriptación real)
        // Por ahora lo guardamos en texto plano pero solo accesible por el dueño de la tarea
        // NOTA: En producción, usar AES-256 o similar para encriptar
        
        // Actualizar la tarea con el secret (podríamos crear una tabla separada para mayor seguridad)
        // Por ahora, lo guardamos en un campo nuevo de la tabla tasks
        // Primero verificar si existe la columna
        $checkColumn = $conn->query("SHOW COLUMNS FROM tasks LIKE 'escrow_secret'");
        if ($checkColumn->num_rows === 0) {
            // Crear columna si no existe
            $conn->query("ALTER TABLE tasks ADD COLUMN escrow_secret VARCHAR(255) NULL AFTER escrow_id");
        }

        $stmt = $conn->prepare("
            UPDATE tasks 
            SET escrow_secret = ? 
            WHERE id = ? AND user_id = ?
        ");
        $stmt->bind_param("sii", $escrowSecret, $taskId, $loggedInUserId);
        $stmt->execute();
        $stmt->close();

        $conn->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Secret key guardado exitosamente'
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        error_log('Error en save_escrow_secret.php: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }

    $conn->close();
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}
?>

