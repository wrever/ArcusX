<?php
/**
 * Script para resetear el human_id_action_id de todos los usuarios
 * Esto permite que los usuarios obtengan nuevos intentos de verificación Human ID
 * 
 * USO:
 * - Acceder desde navegador: http://arcusx.one/api/auth/reset_human_id_action_id.php
 * - O ejecutar desde línea de comandos: php reset_human_id_action_id.php
 */

require_once 'config.php';

// Headers para JSON
header("Content-Type: application/json; charset=UTF-8");

// Si se ejecuta desde línea de comandos, no necesitamos headers HTTP
if (php_sapi_name() !== 'cli') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
}

// Manejar preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

try {
    // Verificar conexión
    if ($conn->connect_error) {
        throw new Exception("Error de conexión: " . $conn->connect_error);
    }
    
    // Verificar que la base de datos esté seleccionada
    if (!$conn->select_db(DB_NAME)) {
        throw new Exception("Error al seleccionar la base de datos: " . DB_NAME);
    }
    
    // Resetear todos los human_id_action_id
    $sql = "UPDATE users SET human_id_action_id = NULL";
    $result = $conn->query($sql);
    
    if ($result === false) {
        throw new Exception("Error ejecutando UPDATE: " . $conn->error);
    }
    
    $affectedRows = $conn->affected_rows;
    
    // Obtener el número total de usuarios
    $countSql = "SELECT COUNT(*) as total FROM users";
    $countResult = $conn->query($countSql);
    $totalUsers = 0;
    if ($countResult) {
        $row = $countResult->fetch_assoc();
        $totalUsers = $row['total'];
    }
    
    echo json_encode([
        'success' => true,
        'message' => "Action IDs reseteados exitosamente",
        'affected_rows' => $affectedRows,
        'total_users' => $totalUsers,
        'database' => DB_NAME
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'database' => defined('DB_NAME') ? DB_NAME : 'No definida'
    ], JSON_PRETTY_PRINT);
}

$conn->close();
?>

