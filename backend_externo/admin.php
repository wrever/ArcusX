<?php
/**
 * admin.php
 * Punto de entrada simplificado para el panel de administración
 * Solo hace routing - toda la lógica está en admin_common.php y admin_actions.php
 */

// Incluir infraestructura común (CORS, autenticación, utilidades)
// admin_common.php ya maneja OPTIONS, carga dependencias, autentica y verifica admin
// Al final de admin_common.php, $conn, $user y $jwt_secret están disponibles
require_once 'admin_common.php';

// Incluir funciones handler
require_once 'admin_actions.php';

// Obtener acción de la petición
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if (empty($action)) {
    sendErrorResponse('Parámetro "action" requerido', 400);
}

// Router de acciones - solo routing, toda la lógica está en admin_actions.php
try {
    $response = null;
    
    switch ($action) {
        // ========== ESTADÍSTICAS ==========
        case 'get_stats':
            $response = handleGetStats($conn, $user);
            break;
        
        // ========== USUARIOS ==========
        case 'get_users':
            $params = array_merge($_GET, $_POST);
            $response = handleGetUsers($conn, $user, $params);
            break;
        
        case 'get_user_details':
            $params = array_merge($_GET, $_POST);
            $response = handleGetUserDetails($conn, $user, $params);
            break;
        
        case 'update_user':
            $data = json_decode(file_get_contents('php://input'), true) ?: [];
            $response = handleUpdateUser($conn, $user, $data);
            break;
        
        // ========== TAREAS ==========
        case 'get_tasks':
            $params = array_merge($_GET, $_POST);
            $response = handleGetTasks($conn, $user, $params);
            break;
        
        case 'get_task_details':
            $params = array_merge($_GET, $_POST);
            $response = handleGetTaskDetails($conn, $user, $params);
            break;
        
        case 'update_task':
            $data = json_decode(file_get_contents('php://input'), true) ?: [];
            $response = handleUpdateTask($conn, $user, $data);
            break;
        
        case 'delete_task':
            $params = array_merge($_GET, $_POST);
            $response = handleDeleteTask($conn, $user, $params);
            break;
        
        // ========== CONFIGURACIÓN ==========
        case 'get_config':
            $response = handleGetConfig($conn, $user);
            break;
        
        case 'update_config':
            $data = json_decode(file_get_contents('php://input'), true) ?: [];
            $response = handleUpdateConfig($conn, $user, $data);
            break;
        
        // ========== LOGS ==========
        case 'get_logs':
            $params = array_merge($_GET, $_POST);
            $response = handleGetLogs($conn, $user, $params);
            break;
        
        // ========== DISPUTAS/ARBITRAJE ==========
        case 'get_disputes':
            $params = array_merge($_GET, $_POST);
            $response = handleGetDisputes($conn, $user, $params);
            break;
        
        case 'get_dispute_details':
            $params = array_merge($_GET, $_POST);
            $response = handleGetDisputeDetails($conn, $user, $params);
            break;
        
        case 'resolve_dispute':
            $data = json_decode(file_get_contents('php://input'), true) ?: [];
            $response = handleResolveDispute($conn, $user, $data);
            break;
        
        // ========== NOTIFICACIONES ==========
        case 'send_notification':
            $data = json_decode(file_get_contents('php://input'), true) ?: [];
            $response = handleSendNotification($conn, $user, $data);
            break;
        
        case 'send_broadcast':
            $data = json_decode(file_get_contents('php://input'), true) ?: [];
            $response = handleSendBroadcast($conn, $user, $data);
            break;
        
        case 'get_notifications':
            $params = array_merge($_GET, $_POST);
            $response = handleGetNotifications($conn, $user, $params);
            break;
        
        // ========== ACCIÓN NO VÁLIDA ==========
        default:
            sendErrorResponse('Acción no válida: ' . $action, 400);
            break;
    }
    
    // Enviar respuesta JSON
    if ($response !== null) {
        // Limpiar cualquier output anterior
        while (ob_get_level() > 1) {
            ob_end_clean();
        }
        
        http_response_code(200);
        echo json_encode($response);
        exit();
    }
    
} catch (Exception $e) {
    error_log('Exception en admin.php: ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
    error_log('Stack trace: ' . $e->getTraceAsString());
    sendErrorResponse('Error interno del servidor', 500, $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
} catch (Error $e) {
    error_log('Fatal error en admin.php: ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
    error_log('Stack trace: ' . $e->getTraceAsString());
    sendErrorResponse('Error fatal del servidor', 500, $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
} catch (Throwable $e) {
    error_log('Throwable en admin.php: ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
    error_log('Stack trace: ' . $e->getTraceAsString());
    sendErrorResponse('Error inesperado del servidor', 500, $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
}

// Si llegamos aquí sin respuesta, algo salió mal
// El shutdown handler en admin_common.php debería capturarlo, pero por si acaso:
if (!headers_sent()) {
    $output = ob_get_contents();
    if (empty($output)) {
        sendErrorResponse('Error: No se generó respuesta para la acción solicitada', 500);
    }
}

// Cerrar conexión a la base de datos
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
?>
