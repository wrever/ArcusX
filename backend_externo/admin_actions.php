<?php
/**
 * admin_actions.php
 * Funciones handler para todas las acciones del panel de administración
 * Cada función recibe $conn y $user como parámetros y retorna un array
 * NO hace echo, header() ni exit() - eso lo maneja admin.php
 */

// ========== ESTADÍSTICAS ==========

/**
 * Obtener estadísticas generales del sistema
 */
function handleGetStats($conn, $user) {
    // Obtener estadísticas generales
    $stats = [];
    
    // Total usuarios
    $result = $conn->query("SELECT COUNT(*) as total FROM users");
    if ($result === false) {
        throw new Exception("Error en consulta de usuarios: " . $conn->error);
    }
    $stats['total_users'] = (int)$result->fetch_assoc()['total'];
    
    // Total tareas
    $result = $conn->query("SELECT COUNT(*) as total FROM tasks");
    if ($result === false) {
        throw new Exception("Error en consulta de tareas: " . $conn->error);
    }
    $stats['total_tasks'] = (int)$result->fetch_assoc()['total'];
    
    // Tareas activas
    $result = $conn->query("SELECT COUNT(*) as total FROM tasks WHERE status = 'in_progress'");
    if ($result === false) {
        throw new Exception("Error en consulta de tareas activas: " . $conn->error);
    }
    $stats['active_tasks'] = (int)$result->fetch_assoc()['total'];
    
    // Tareas completadas
    $result = $conn->query("SELECT COUNT(*) as total FROM tasks WHERE status = 'completed'");
    if ($result === false) {
        throw new Exception("Error en consulta de tareas completadas: " . $conn->error);
    }
    $stats['completed_tasks'] = (int)$result->fetch_assoc()['total'];
    
    // Total escrows
    $result = $conn->query("SELECT COUNT(*) as total FROM tasks WHERE escrow_id IS NOT NULL");
    if ($result === false) {
        throw new Exception("Error en consulta de escrows: " . $conn->error);
    }
    $stats['total_escrows'] = (int)$result->fetch_assoc()['total'];
    
    // Obtener platform fee configurado (por defecto 0.3% = 0.003)
    $platformFee = 0.003; // Valor por defecto
    try {
        $checkTable = $conn->query("SHOW TABLES LIKE 'system_config'");
        if ($checkTable !== false && $checkTable->num_rows > 0) {
            $feeResult = $conn->query("SELECT config_value FROM system_config WHERE config_key = 'platform_fee'");
            if ($feeResult !== false && $feeResult->num_rows > 0) {
                $feeRow = $feeResult->fetch_assoc();
                $feeValue = $feeRow['config_value'];
                // Convertir a float si es string
                $platformFee = is_numeric($feeValue) ? (float)$feeValue : 0.003;
            }
        }
    } catch (Exception $e) {
        // Si hay error al obtener el fee, usar el valor por defecto
        error_log('Error al obtener platform_fee en handleGetStats: ' . $e->getMessage());
        $platformFee = 0.003;
    }
    
    // Volumen total (suma de precios + comisiones de tareas completadas)
    // En el nuevo modelo: el cliente paga price + commission, entonces volumen = SUM(price * (1 + platformFee))
    $platformFeeEscaped = (float)$platformFee;
    $result = $conn->query("SELECT COALESCE(SUM(price * (1 + " . $platformFeeEscaped . ")), 0) as total FROM tasks WHERE status = 'completed' AND escrow_status = 'completed'");
    if ($result === false) {
        throw new Exception("Error en consulta de volumen: " . $conn->error);
    }
    $stats['total_volume_usdc'] = (float)$result->fetch_assoc()['total'];
    
    // Comisiones totales (usando el fee configurado del sistema)
    // Las comisiones son: SUM(price * platformFee)
    $commissionResult = $conn->query("SELECT COALESCE(SUM(price * " . $platformFeeEscaped . "), 0) as total FROM tasks WHERE status = 'completed' AND escrow_status = 'completed'");
    if ($commissionResult === false) {
        throw new Exception("Error en consulta de comisiones: " . $conn->error);
    }
    $stats['total_commission_usdc'] = (float)$commissionResult->fetch_assoc()['total'];
    
    // ========== ESTADÍSTICAS POR PERÍODO ==========
    
    // Volumen de hoy (tareas completadas hoy)
    // En el nuevo modelo: volumen = SUM(price * (1 + platformFee)) porque el cliente paga price + commission
    // Usar COALESCE para obtener la mejor fecha disponible: escrow_completed_at > completed_at > created_at
    $result = $conn->query("SELECT COALESCE(SUM(price * (1 + " . $platformFeeEscaped . ")), 0) as total FROM tasks WHERE status = 'completed' AND escrow_status = 'completed' AND DATE(COALESCE(escrow_completed_at, completed_at, created_at)) = CURDATE()");
    if ($result === false) {
        throw new Exception("Error en consulta de volumen hoy: " . $conn->error);
    }
    $stats['volume_today'] = (float)$result->fetch_assoc()['total'];
    // Fees de hoy: SUM(price * platformFee)
    $feesResult = $conn->query("SELECT COALESCE(SUM(price * " . $platformFeeEscaped . "), 0) as total FROM tasks WHERE status = 'completed' AND escrow_status = 'completed' AND DATE(COALESCE(escrow_completed_at, completed_at, created_at)) = CURDATE()");
    if ($feesResult === false) {
        throw new Exception("Error en consulta de fees hoy: " . $conn->error);
    }
    $stats['fees_today'] = (float)$feesResult->fetch_assoc()['total'];
    
    // Volumen de esta semana (tareas completadas esta semana)
    $result = $conn->query("SELECT COALESCE(SUM(price * (1 + " . $platformFeeEscaped . ")), 0) as total FROM tasks WHERE status = 'completed' AND escrow_status = 'completed' AND YEARWEEK(COALESCE(escrow_completed_at, completed_at, created_at), 1) = YEARWEEK(CURDATE(), 1)");
    if ($result === false) {
        throw new Exception("Error en consulta de volumen esta semana: " . $conn->error);
    }
    $stats['volume_this_week'] = (float)$result->fetch_assoc()['total'];
    // Fees de esta semana: SUM(price * platformFee)
    $feesResult = $conn->query("SELECT COALESCE(SUM(price * " . $platformFeeEscaped . "), 0) as total FROM tasks WHERE status = 'completed' AND escrow_status = 'completed' AND YEARWEEK(COALESCE(escrow_completed_at, completed_at, created_at), 1) = YEARWEEK(CURDATE(), 1)");
    if ($feesResult === false) {
        throw new Exception("Error en consulta de fees esta semana: " . $conn->error);
    }
    $stats['fees_this_week'] = (float)$feesResult->fetch_assoc()['total'];
    
    // Volumen de este mes (tareas completadas este mes)
    $result = $conn->query("SELECT COALESCE(SUM(price * (1 + " . $platformFeeEscaped . ")), 0) as total FROM tasks WHERE status = 'completed' AND escrow_status = 'completed' AND MONTH(COALESCE(escrow_completed_at, completed_at, created_at)) = MONTH(CURDATE()) AND YEAR(COALESCE(escrow_completed_at, completed_at, created_at)) = YEAR(CURDATE())");
    if ($result === false) {
        throw new Exception("Error en consulta de volumen este mes: " . $conn->error);
    }
    $stats['volume_this_month'] = (float)$result->fetch_assoc()['total'];
    // Fees de este mes: SUM(price * platformFee)
    $feesResult = $conn->query("SELECT COALESCE(SUM(price * " . $platformFeeEscaped . "), 0) as total FROM tasks WHERE status = 'completed' AND escrow_status = 'completed' AND MONTH(COALESCE(escrow_completed_at, completed_at, created_at)) = MONTH(CURDATE()) AND YEAR(COALESCE(escrow_completed_at, completed_at, created_at)) = YEAR(CURDATE())");
    if ($feesResult === false) {
        throw new Exception("Error en consulta de fees este mes: " . $conn->error);
    }
    $stats['fees_this_month'] = (float)$feesResult->fetch_assoc()['total'];
    
    // Transacciones pendientes
    $result = $conn->query("SELECT COUNT(*) as total FROM tasks WHERE pending_transaction_xdr IS NOT NULL");
    if ($result === false) {
        throw new Exception("Error en consulta de transacciones pendientes: " . $conn->error);
    }
    $stats['pending_transactions'] = (int)$result->fetch_assoc()['total'];
    
    // Usuarios registrados hoy
    $result = $conn->query("SELECT COUNT(*) as total FROM users WHERE DATE(created_at) = CURDATE()");
    if ($result === false) {
        throw new Exception("Error en consulta de usuarios hoy: " . $conn->error);
    }
    $stats['users_today'] = (int)$result->fetch_assoc()['total'];
    
    // Tareas creadas hoy
    $result = $conn->query("SELECT COUNT(*) as total FROM tasks WHERE DATE(created_at) = CURDATE()");
    if ($result === false) {
        throw new Exception("Error en consulta de tareas hoy: " . $conn->error);
    }
    $stats['tasks_today'] = (int)$result->fetch_assoc()['total'];
    
    logAdminAction($conn, $user['id'], 'get_stats');
    
    return ['success' => true, 'stats' => $stats];
}

// ========== USUARIOS ==========

/**
 * Obtener lista de usuarios con paginación y filtros
 */
function handleGetUsers($conn, $user, $params) {
    $page = isset($params['page']) ? (int)$params['page'] : 1;
    $limit = isset($params['limit']) ? (int)$params['limit'] : 20;
    $search = isset($params['search']) ? trim($params['search']) : '';
    $role = isset($params['role']) ? trim($params['role']) : '';
    $isAdminFilter = isset($params['is_admin']) ? (int)$params['is_admin'] : -1;
    
    $offset = ($page - 1) * $limit;
    
    $where = [];
    $bindParams = [];
    $types = '';
    
    if (!empty($search)) {
        $where[] = "(username LIKE ? OR email LIKE ?)";
        $searchParam = "%$search%";
        $bindParams[] = $searchParam;
        $bindParams[] = $searchParam;
        $types .= 'ss';
    }
    
    if (!empty($role)) {
        $where[] = "role = ?";
        $bindParams[] = $role;
        $types .= 's';
    }
    
    if ($isAdminFilter >= 0) {
        $where[] = "is_admin = ?";
        $bindParams[] = $isAdminFilter;
        $types .= 'i';
    }
    
    $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
    
    // Contar total
    $countSql = "SELECT COUNT(*) as total FROM users $whereClause";
    $countStmt = $conn->prepare($countSql);
    if (!empty($bindParams)) {
        $countStmt->bind_param($types, ...$bindParams);
    }
    $countStmt->execute();
    $total = $countStmt->get_result()->fetch_assoc()['total'];
    
    // Obtener usuarios
    $sql = "SELECT id, username, email, role, is_admin, wallet_address, completed_tasks_count, created_at FROM users $whereClause ORDER BY created_at DESC LIMIT ? OFFSET ?";
    $stmt = $conn->prepare($sql);
    
    $bindParams[] = $limit;
    $bindParams[] = $offset;
    $types .= 'ii';
    
    if (!empty($bindParams)) {
        $stmt->bind_param($types, ...$bindParams);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    
    logAdminAction($conn, $user['id'], 'get_users', 'users', null, ['page' => $page, 'limit' => $limit]);
    
    return [
        'success' => true,
        'users' => $users,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int)$total,
            'total_pages' => ceil($total / $limit)
        ]
    ];
}

/**
 * Obtener detalles de un usuario específico
 */
function handleGetUserDetails($conn, $user, $params) {
    $userId = isset($params['user_id']) ? (int)$params['user_id'] : 0;
    
    if ($userId <= 0) {
        throw new Exception('user_id inválido');
    }
    
    $stmt = $conn->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        throw new Exception('Usuario no encontrado');
    }
    
    $userData = $result->fetch_assoc();
    unset($userData['password']); // No enviar contraseña
    
    // Obtener tareas del usuario
    $stmt = $conn->prepare("SELECT id, title, status, price, created_at FROM tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 10");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $tasks = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $userData['recent_tasks'] = $tasks;
    
    logAdminAction($conn, $user['id'], 'get_user_details', 'user', $userId);
    
    return ['success' => true, 'user' => $userData];
}

/**
 * Actualizar información de un usuario
 */
function handleUpdateUser($conn, $user, $data) {
    $userId = isset($data['user_id']) ? (int)$data['user_id'] : 0;
    
    if ($userId <= 0) {
        throw new Exception('user_id inválido');
    }
    
    $updates = [];
    $bindParams = [];
    $types = '';
    
    if (isset($data['username'])) {
        $updates[] = "username = ?";
        $bindParams[] = trim($data['username']);
        $types .= 's';
    }
    
    if (isset($data['email'])) {
        $updates[] = "email = ?";
        $bindParams[] = trim($data['email']);
        $types .= 's';
    }
    
    if (isset($data['role'])) {
        $updates[] = "role = ?";
        $bindParams[] = trim($data['role']);
        $types .= 's';
    }
    
    if (isset($data['is_admin'])) {
        $updates[] = "is_admin = ?";
        $bindParams[] = (int)$data['is_admin'];
        $types .= 'i';
    }
    
    if (empty($updates)) {
        throw new Exception('No hay campos para actualizar');
    }
    
    $bindParams[] = $userId;
    $types .= 'i';
    
    $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$bindParams);
    $stmt->execute();
    
    logAdminAction($conn, $user['id'], 'update_user', 'user', $userId, $data);
    
    return ['success' => true, 'message' => 'Usuario actualizado correctamente'];
}

// ========== TAREAS ==========

/**
 * Obtener lista de tareas con paginación y filtros
 */
function handleGetTasks($conn, $user, $params) {
    $page = isset($params['page']) ? (int)$params['page'] : 1;
    $limit = isset($params['limit']) ? (int)$params['limit'] : 20;
    $status = isset($params['status']) ? trim($params['status']) : '';
    $userId = isset($params['user_id']) ? (int)$params['user_id'] : 0;
    $search = isset($params['search']) ? trim($params['search']) : '';
    
    $offset = ($page - 1) * $limit;
    
    $where = [];
    $bindParams = [];
    $types = '';
    
    if (!empty($status)) {
        $where[] = "status = ?";
        $bindParams[] = $status;
        $types .= 's';
    }
    
    if ($userId > 0) {
        $where[] = "user_id = ?";
        $bindParams[] = $userId;
        $types .= 'i';
    }
    
    if (!empty($search)) {
        $where[] = "(title LIKE ? OR description LIKE ?)";
        $searchParam = "%$search%";
        $bindParams[] = $searchParam;
        $bindParams[] = $searchParam;
        $types .= 'ss';
    }
    
    $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
    
    // Contar total
    $countSql = "SELECT COUNT(*) as total FROM tasks $whereClause";
    $countStmt = $conn->prepare($countSql);
    if (!empty($bindParams)) {
        $countStmt->bind_param($types, ...$bindParams);
    }
    $countStmt->execute();
    $total = $countStmt->get_result()->fetch_assoc()['total'];
    
    // Obtener tareas
    $sql = "SELECT t.*, u.username as creator_username FROM tasks t LEFT JOIN users u ON t.user_id = u.id $whereClause ORDER BY t.created_at DESC LIMIT ? OFFSET ?";
    $stmt = $conn->prepare($sql);
    
    $bindParams[] = $limit;
    $bindParams[] = $offset;
    $types .= 'ii';
    
    if (!empty($bindParams)) {
        $stmt->bind_param($types, ...$bindParams);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    
    $tasks = [];
    while ($row = $result->fetch_assoc()) {
        $tasks[] = $row;
    }
    
    logAdminAction($conn, $user['id'], 'get_tasks', 'tasks', null, ['page' => $page, 'limit' => $limit]);
    
    return [
        'success' => true,
        'tasks' => $tasks,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int)$total,
            'total_pages' => ceil($total / $limit)
        ]
    ];
}

/**
 * Obtener lista de escrows con paginación y filtros
 */
function handleGetEscrows($conn, $user, $params) {
    $page = isset($params['page']) ? (int)$params['page'] : 1;
    $limit = isset($params['limit']) ? (int)$params['limit'] : 20;
    $escrowStatus = isset($params['escrow_status']) ? trim($params['escrow_status']) : '';
    $taskStatus = isset($params['task_status']) ? trim($params['task_status']) : '';
    $search = isset($params['search']) ? trim($params['search']) : '';
    $startDate = isset($params['start_date']) ? trim($params['start_date']) : '';
    $endDate = isset($params['end_date']) ? trim($params['end_date']) : '';
    
    $offset = ($page - 1) * $limit;
    
    $where = [];
    $bindParams = [];
    $types = '';
    
    // Solo escrows que tienen escrow_id (no NULL)
    $where[] = "t.escrow_id IS NOT NULL";
    
    if (!empty($escrowStatus)) {
        $where[] = "t.escrow_status = ?";
        $bindParams[] = $escrowStatus;
        $types .= 's';
    }
    
    if (!empty($taskStatus)) {
        $where[] = "t.status = ?";
        $bindParams[] = $taskStatus;
        $types .= 's';
    }
    
    if (!empty($search)) {
        // Buscar por escrow_id o task_id
        $where[] = "(t.escrow_id LIKE ? OR t.id = ?)";
        $searchParam = "%$search%";
        $bindParams[] = $searchParam;
        // Intentar convertir search a int para task_id
        $taskIdSearch = is_numeric($search) ? (int)$search : 0;
        $bindParams[] = $taskIdSearch;
        $types .= 'si';
    }
    
    if (!empty($startDate)) {
        $where[] = "t.escrow_created_at >= ?";
        $bindParams[] = $startDate;
        $types .= 's';
    }
    
    if (!empty($endDate)) {
        $where[] = "t.escrow_created_at <= ?";
        $bindParams[] = $endDate . ' 23:59:59';
        $types .= 's';
    }
    
    $whereClause = 'WHERE ' . implode(' AND ', $where);
    
    // Contar total
    $countSql = "SELECT COUNT(*) as total FROM tasks t $whereClause";
    $countStmt = $conn->prepare($countSql);
    if (!empty($bindParams)) {
        $countStmt->bind_param($types, ...$bindParams);
    }
    $countStmt->execute();
    $total = $countStmt->get_result()->fetch_assoc()['total'];
    $countStmt->close();
    
    // Obtener escrows con información de la tarea asociada
    $sql = "SELECT 
                t.escrow_id,
                t.id as task_id,
                t.title as task_title,
                t.price as task_price,
                t.currency as task_currency,
                t.escrow_status,
                t.status as task_status,
                t.escrow_created_at,
                t.escrow_completed_at,
                t.created_at as task_created_at,
                u_client.username as client_username,
                u_client.id as client_id,
                u_worker.username as worker_username,
                u_worker.id as worker_id
            FROM tasks t
            LEFT JOIN users u_client ON t.user_id = u_client.id
            LEFT JOIN users u_worker ON t.accepted_applicant_id = u_worker.id
            $whereClause
            ORDER BY t.escrow_created_at DESC
            LIMIT ? OFFSET ?";
    
    $stmt = $conn->prepare($sql);
    
    $bindParams[] = $limit;
    $bindParams[] = $offset;
    $types .= 'ii';
    
    if (!empty($bindParams)) {
        $stmt->bind_param($types, ...$bindParams);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    
    $escrows = [];
    while ($row = $result->fetch_assoc()) {
        $escrows[] = $row;
    }
    $stmt->close();
    
    logAdminAction($conn, $user['id'], 'get_escrows', 'escrows', null, [
        'page' => $page,
        'limit' => $limit,
        'escrow_status' => $escrowStatus,
        'task_status' => $taskStatus
    ]);
    
    return [
        'success' => true,
        'escrows' => $escrows,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int)$total,
            'total_pages' => ceil($total / $limit)
        ]
    ];
}

/**
 * Obtener detalles de una tarea específica
 */
function handleGetTaskDetails($conn, $user, $params) {
    $taskId = isset($params['task_id']) ? (int)$params['task_id'] : 0;
    
    if ($taskId <= 0) {
        throw new Exception('task_id inválido');
    }
    
    $stmt = $conn->prepare("SELECT t.*, u1.username as creator_username, u2.username as worker_username FROM tasks t LEFT JOIN users u1 ON t.user_id = u1.id LEFT JOIN users u2 ON t.accepted_applicant_id = u2.id WHERE t.id = ?");
    $stmt->bind_param("i", $taskId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        throw new Exception('Tarea no encontrada');
    }
    
    $task = $result->fetch_assoc();
    
    // Obtener propuestas
    $stmt = $conn->prepare("SELECT a.*, u.username FROM applications a LEFT JOIN users u ON a.applicant_id = u.id WHERE a.task_id = ?");
    $stmt->bind_param("i", $taskId);
    $stmt->execute();
    $task['proposals'] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    
    logAdminAction($conn, $user['id'], 'get_task_details', 'task', $taskId);
    
    return ['success' => true, 'task' => $task];
}

/**
 * Actualizar información de una tarea
 */
function handleUpdateTask($conn, $user, $data) {
    $taskId = isset($data['task_id']) ? (int)$data['task_id'] : 0;
    
    if ($taskId <= 0) {
        throw new Exception('task_id inválido');
    }
    
    $updates = [];
    $bindParams = [];
    $types = '';
    
    if (isset($data['status'])) {
        $updates[] = "status = ?";
        $bindParams[] = trim($data['status']);
        $types .= 's';
    }
    
    if (isset($data['price'])) {
        $updates[] = "price = ?";
        $bindParams[] = (float)$data['price'];
        $types .= 'd';
    }
    
    if (isset($data['title'])) {
        $updates[] = "title = ?";
        $bindParams[] = trim($data['title']);
        $types .= 's';
    }
    
    if (isset($data['description'])) {
        $updates[] = "description = ?";
        $bindParams[] = trim($data['description']);
        $types .= 's';
    }
    
    if (empty($updates)) {
        throw new Exception('No hay campos para actualizar');
    }
    
    $bindParams[] = $taskId;
    $types .= 'i';
    
    $sql = "UPDATE tasks SET " . implode(', ', $updates) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$bindParams);
    $stmt->execute();
    
    logAdminAction($conn, $user['id'], 'update_task', 'task', $taskId, $data);
    
    return ['success' => true, 'message' => 'Tarea actualizada correctamente'];
}

/**
 * Eliminar una tarea
 */
function handleDeleteTask($conn, $user, $params) {
    $taskId = isset($params['task_id']) ? (int)$params['task_id'] : 0;
    
    if ($taskId <= 0) {
        throw new Exception('task_id inválido');
    }
    
    $stmt = $conn->prepare("DELETE FROM tasks WHERE id = ?");
    $stmt->bind_param("i", $taskId);
    $stmt->execute();
    
    logAdminAction($conn, $user['id'], 'delete_task', 'task', $taskId);
    
    return ['success' => true, 'message' => 'Tarea eliminada correctamente'];
}

// ========== CONFIGURACIÓN ==========

/**
 * Obtener configuraciones del sistema
 */
function handleGetConfig($conn, $user) {
    // Verificar si la tabla existe
    $checkTable = $conn->query("SHOW TABLES LIKE 'system_config'");
    if ($checkTable->num_rows === 0) {
        // Si no existe, retornar array vacío
        return ['success' => true, 'configs' => []];
    }
    
    // Obtener todas las configuraciones
    $result = $conn->query("SELECT config_key, config_value FROM system_config ORDER BY config_key");
    
    if ($result === false) {
        // Si hay error, retornar array vacío en lugar de fallar
        return ['success' => true, 'configs' => []];
    }
    
    $configs = [];
    while ($row = $result->fetch_assoc()) {
        // Intentar parsear JSON si es posible, sino usar el valor como string
        $value = $row['config_value'];
        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $value = $decoded;
        } else {
            // Intentar convertir a número si es posible
            if (is_numeric($value)) {
                $value = (strpos($value, '.') !== false) ? (float)$value : (int)$value;
            }
        }
        
        $configs[] = [
            'config_key' => $row['config_key'],
            'config_value' => $value
        ];
    }
    
    return ['success' => true, 'configs' => $configs];
}

/**
 * Actualizar configuración del sistema
 * Hace INSERT si no existe, UPDATE si existe (UPSERT)
 */
function handleUpdateConfig($conn, $user, $data) {
    $configKey = isset($data['config_key']) ? trim($data['config_key']) : '';
    $configValue = isset($data['config_value']) ? $data['config_value'] : '';
    
    if (empty($configKey)) {
        throw new Exception('config_key requerido');
    }
    
    // Convertir a string si es necesario
    if (is_array($configValue) || is_object($configValue)) {
        $configValue = json_encode($configValue);
    } else {
        $configValue = (string)$configValue;
    }
    
    // Verificar si la tabla system_config existe, si no, crearla
    $checkTable = $conn->query("SHOW TABLES LIKE 'system_config'");
    if ($checkTable === false) {
        throw new Exception('Error al verificar existencia de tabla system_config: ' . $conn->error);
    }
    
    if ($checkTable->num_rows === 0) {
        // Crear tabla si no existe
        $createTable = "CREATE TABLE IF NOT EXISTS system_config (
            id INT AUTO_INCREMENT PRIMARY KEY,
            config_key VARCHAR(255) NOT NULL UNIQUE,
            config_value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            updated_by INT NULL,
            INDEX idx_config_key (config_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        if ($conn->query($createTable) === false) {
            throw new Exception('Error al crear tabla system_config: ' . $conn->error);
        }
    }
    
    // Hacer UPSERT (INSERT si no existe, UPDATE si existe)
    $stmt = $conn->prepare("
        INSERT INTO system_config (config_key, config_value, updated_by) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            config_value = VALUES(config_value),
            updated_by = VALUES(updated_by),
            updated_at = CURRENT_TIMESTAMP
    ");
    $stmt->bind_param("ssi", $configKey, $configValue, $user['id']);
    $stmt->execute();
    
    if ($stmt->error) {
        throw new Exception('Error al guardar configuración: ' . $stmt->error);
    }
    
    logAdminAction($conn, $user['id'], 'update_config', 'config', null, ['key' => $configKey, 'value' => $configValue]);
    
    return ['success' => true, 'message' => 'Configuración actualizada correctamente'];
}

// ========== LOGS ==========

/**
 * Obtener logs de acciones de administradores
 */
function handleGetLogs($conn, $user, $params) {
    $page = isset($params['page']) ? (int)$params['page'] : 1;
    $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
    $adminId = isset($params['admin_id']) ? (int)$params['admin_id'] : 0;
    $action = isset($params['action']) ? trim($params['action']) : '';
    
    $offset = ($page - 1) * $limit;
    
    $where = [];
    $bindParams = [];
    $types = '';
    
    if ($adminId > 0) {
        $where[] = "admin_id = ?";
        $bindParams[] = $adminId;
        $types .= 'i';
    }
    
    if (!empty($action)) {
        $where[] = "action = ?";
        $bindParams[] = $action;
        $types .= 's';
    }
    
    $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
    
    // Contar total
    $countSql = "SELECT COUNT(*) as total FROM admin_logs $whereClause";
    $countStmt = $conn->prepare($countSql);
    if (!empty($bindParams)) {
        $countStmt->bind_param($types, ...$bindParams);
    }
    $countStmt->execute();
    $total = $countStmt->get_result()->fetch_assoc()['total'];
    
    // Obtener logs
    $sql = "SELECT l.*, u.username as admin_username FROM admin_logs l LEFT JOIN users u ON l.admin_id = u.id $whereClause ORDER BY l.created_at DESC LIMIT ? OFFSET ?";
    $stmt = $conn->prepare($sql);
    
    $bindParams[] = $limit;
    $bindParams[] = $offset;
    $types .= 'ii';
    
    if (!empty($bindParams)) {
        $stmt->bind_param($types, ...$bindParams);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    
    $logs = [];
    while ($row = $result->fetch_assoc()) {
        if ($row['details']) {
            $row['details'] = json_decode($row['details'], true);
        }
        $logs[] = $row;
    }
    
    return [
        'success' => true,
        'logs' => $logs,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int)$total,
            'total_pages' => ceil($total / $limit)
        ]
    ];
}

// ========== NOTIFICACIONES ==========

/**
 * Enviar notificación a un usuario específico o global (si user_id es NULL)
 */
function handleSendNotification($conn, $user, $data) {
    $userId = isset($data['user_id']) && $data['user_id'] > 0 ? (int)$data['user_id'] : null;
    $title = isset($data['title']) ? trim($data['title']) : '';
    $message = isset($data['message']) ? trim($data['message']) : '';
    $type = isset($data['type']) ? trim($data['type']) : 'info';
    
    // Validar campos requeridos
    if (empty($title)) {
        throw new Exception('El título es requerido');
    }
    if (empty($message)) {
        throw new Exception('El mensaje es requerido');
    }
    
    // Validar tipo
    $allowedTypes = ['info', 'warning', 'success', 'error'];
    if (!in_array($type, $allowedTypes)) {
        $type = 'info';
    }
    
    // Si se especifica un user_id, verificar que existe
    if ($userId !== null) {
        $checkStmt = $conn->prepare("SELECT id FROM users WHERE id = ?");
        $checkStmt->bind_param("i", $userId);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        if ($result->num_rows === 0) {
            throw new Exception('Usuario no encontrado');
        }
        $checkStmt->close();
    }
    
    // Insertar notificación
    $stmt = $conn->prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("isss", $userId, $title, $message, $type);
    
    if (!$stmt->execute()) {
        throw new Exception('Error al crear notificación: ' . $stmt->error);
    }
    
    $notificationId = $conn->insert_id;
    $stmt->close();
    
    logAdminAction($conn, $user['id'], 'send_notification', 'notification', $notificationId, [
        'user_id' => $userId,
        'title' => $title,
        'type' => $type
    ]);
    
    return [
        'success' => true,
        'message' => $userId ? 'Notificación enviada al usuario' : 'Notificación global enviada',
        'notification_id' => $notificationId
    ];
}

/**
 * Enviar notificación masiva (broadcast) a todos los usuarios
 */
function handleSendBroadcast($conn, $user, $data) {
    $title = isset($data['title']) ? trim($data['title']) : '';
    $message = isset($data['message']) ? trim($data['message']) : '';
    $type = isset($data['type']) ? trim($data['type']) : 'info';
    
    // Validar campos requeridos
    if (empty($title)) {
        throw new Exception('El título es requerido');
    }
    if (empty($message)) {
        throw new Exception('El mensaje es requerido');
    }
    
    // Validar tipo
    $allowedTypes = ['info', 'warning', 'success', 'error'];
    if (!in_array($type, $allowedTypes)) {
        $type = 'info';
    }
    
    // Insertar notificación global (user_id = NULL)
    $stmt = $conn->prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (NULL, ?, ?, ?)");
    $stmt->bind_param("sss", $title, $message, $type);
    
    if (!$stmt->execute()) {
        throw new Exception('Error al crear notificación masiva: ' . $stmt->error);
    }
    
    $notificationId = $conn->insert_id;
    $stmt->close();
    
    logAdminAction($conn, $user['id'], 'send_broadcast', 'notification', $notificationId, [
        'title' => $title,
        'type' => $type
    ]);
    
    return [
        'success' => true,
        'message' => 'Notificación masiva enviada a todos los usuarios',
        'notification_id' => $notificationId
    ];
}

/**
 * Obtener lista de notificaciones con paginación
 */
function handleGetNotifications($conn, $user, $params) {
    $page = isset($params['page']) ? (int)$params['page'] : 1;
    $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
    $userId = isset($params['user_id']) && $params['user_id'] > 0 ? (int)$params['user_id'] : null;
    
    $offset = ($page - 1) * $limit;
    
    // Construir WHERE clause
    $where = [];
    $bindParams = [];
    $types = '';
    
    if ($userId !== null) {
        $where[] = "n.user_id = ?";
        $bindParams[] = $userId;
        $types .= 'i';
    } else {
        // Si no se especifica user_id, mostrar todas (globales y específicas)
        // No agregar condición WHERE
    }
    
    $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
    
    // Contar total
    $countSql = "SELECT COUNT(*) as total FROM notifications n $whereClause";
    $countStmt = $conn->prepare($countSql);
    if (!empty($bindParams)) {
        $countStmt->bind_param($types, ...$bindParams);
    }
    $countStmt->execute();
    $total = $countStmt->get_result()->fetch_assoc()['total'];
    $countStmt->close();
    
    // Obtener notificaciones con información del usuario
    $sql = "SELECT n.*, u.username as user_username, u.email as user_email 
            FROM notifications n 
            LEFT JOIN users u ON n.user_id = u.id 
            $whereClause 
            ORDER BY n.created_at DESC 
            LIMIT ? OFFSET ?";
    
    $stmt = $conn->prepare($sql);
    $bindParams[] = $limit;
    $bindParams[] = $offset;
    $types .= 'ii';
    
    if (!empty($bindParams)) {
        $stmt->bind_param($types, ...$bindParams);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    
    $notifications = [];
    while ($row = $result->fetch_assoc()) {
        $notifications[] = $row;
    }
    $stmt->close();
    
    return [
        'success' => true,
        'notifications' => $notifications,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int)$total,
            'total_pages' => ceil($total / $limit)
        ]
    ];
}

// ========== DISPUTAS ==========

/**
 * Obtener lista de disputas con paginación y filtros
 */
function handleGetDisputes($conn, $user, $params) {
    $page = isset($params['page']) ? (int)$params['page'] : 1;
    $limit = isset($params['limit']) ? (int)$params['limit'] : 20;
    $status = isset($params['status']) ? trim($params['status']) : '';
    
    $offset = ($page - 1) * $limit;
    
    // Construir WHERE clause
    $where = [];
    $bindParams = [];
    $types = '';
    
    if (!empty($status)) {
        $allowedStatuses = ['pending', 'resolved', 'cancelled'];
        if (in_array($status, $allowedStatuses)) {
            $where[] = "d.status = ?";
            $bindParams[] = $status;
            $types .= 's';
        }
    }
    
    $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
    
    // Contar total
    $countSql = "SELECT COUNT(*) as total FROM disputes d $whereClause";
    $countStmt = $conn->prepare($countSql);
    if (!empty($bindParams)) {
        $countStmt->bind_param($types, ...$bindParams);
    }
    $countStmt->execute();
    $total = $countStmt->get_result()->fetch_assoc()['total'];
    $countStmt->close();
    
    // Obtener disputas con información relacionada
    $sql = "SELECT d.*, 
                   t.title as task_title, 
                   t.price as task_price,
                   t.status as task_status,
                   u1.username as created_by_username,
                   u1.email as created_by_email,
                   u2.username as resolved_by_username
            FROM disputes d
            LEFT JOIN tasks t ON d.task_id = t.id
            LEFT JOIN users u1 ON d.created_by = u1.id
            LEFT JOIN users u2 ON d.resolved_by = u2.id
            $whereClause
            ORDER BY d.created_at DESC
            LIMIT ? OFFSET ?";
    
    $stmt = $conn->prepare($sql);
    $bindParams[] = $limit;
    $bindParams[] = $offset;
    $types .= 'ii';
    
    if (!empty($bindParams)) {
        $stmt->bind_param($types, ...$bindParams);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    
    $disputes = [];
    while ($row = $result->fetch_assoc()) {
        $disputes[] = $row;
    }
    $stmt->close();
    
    return [
        'success' => true,
        'disputes' => $disputes,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int)$total,
            'total_pages' => ceil($total / $limit)
        ]
    ];
}

/**
 * Obtener detalles de una disputa específica
 */
function handleGetDisputeDetails($conn, $user, $params) {
    $disputeId = isset($params['dispute_id']) ? (int)$params['dispute_id'] : 0;
    
    if ($disputeId <= 0) {
        throw new Exception('ID de disputa inválido');
    }
    
    $sql = "SELECT d.*, 
                   t.id as task_id,
                   t.title as task_title,
                   t.description as task_description,
                   t.price as task_price,
                   t.status as task_status,
                   t.escrow_id,
                   t.escrow_status,
                   u1.id as created_by_id,
                   u1.username as created_by_username,
                   u1.email as created_by_email,
                   u2.id as resolved_by_id,
                   u2.username as resolved_by_username,
                   u2.email as resolved_by_email
            FROM disputes d
            LEFT JOIN tasks t ON d.task_id = t.id
            LEFT JOIN users u1 ON d.created_by = u1.id
            LEFT JOIN users u2 ON d.resolved_by = u2.id
            WHERE d.id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $disputeId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        throw new Exception('Disputa no encontrada');
    }
    
    $dispute = $result->fetch_assoc();
    $stmt->close();
    
    // Parsear resolution si existe y es JSON
    if (!empty($dispute['resolution'])) {
        $decodedResolution = json_decode($dispute['resolution'], true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decodedResolution)) {
            $dispute['resolution'] = $decodedResolution;
        }
        // Si no es JSON válido, mantener como string (compatibilidad con datos antiguos)
    }
    
    return [
        'success' => true,
        'dispute' => $dispute
    ];
}

/**
 * Resolver una disputa
 */
function handleResolveDispute($conn, $user, $data) {
    $disputeId = isset($data['dispute_id']) ? (int)$data['dispute_id'] : 0;
    $decision = isset($data['decision']) ? trim($data['decision']) : '';
    $reason = isset($data['reason']) ? trim($data['reason']) : '';
    $refundPercentage = isset($data['refund_percentage']) ? (float)$data['refund_percentage'] : null;
    
    if ($disputeId <= 0) {
        throw new Exception('ID de disputa inválido');
    }
    
    // Validar decisión
    $allowedDecisions = ['client', 'worker', 'split'];
    if (!in_array($decision, $allowedDecisions)) {
        throw new Exception('Decisión inválida. Debe ser: client, worker o split');
    }
    
    if (empty($reason)) {
        throw new Exception('La razón de la resolución es requerida');
    }
    
    // Si es split, validar porcentaje
    if ($decision === 'split' && ($refundPercentage === null || $refundPercentage < 0 || $refundPercentage > 100)) {
        throw new Exception('Para split, se requiere un porcentaje de reembolso válido (0-100)');
    }
    
    // Verificar que la disputa existe y está pendiente
    $checkStmt = $conn->prepare("SELECT id, status, task_id FROM disputes WHERE id = ?");
    $checkStmt->bind_param("i", $disputeId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows === 0) {
        $checkStmt->close();
        throw new Exception('Disputa no encontrada');
    }
    
    $dispute = $result->fetch_assoc();
    if ($dispute['status'] !== 'pending') {
        $checkStmt->close();
        throw new Exception('La disputa ya fue resuelta o cancelada');
    }
    
    $checkStmt->close();
    
    // Obtener información completa de la tarea para calcular montos y liberar fondos
    $taskStmt = $conn->prepare("
        SELECT 
            t.price, 
            t.escrow_id, 
            t.escrow_secret, 
            t.user_id as client_id,
            u1.wallet_address as client_wallet,
            t.accepted_applicant_id as worker_id,
            u2.wallet_address as worker_wallet
        FROM tasks t
        LEFT JOIN users u1 ON t.user_id = u1.id
        LEFT JOIN users u2 ON t.accepted_applicant_id = u2.id
        WHERE t.id = ?
    ");
    $taskStmt->bind_param("i", $dispute['task_id']);
    $taskStmt->execute();
    $taskResult = $taskStmt->get_result();
    $taskData = $taskResult->fetch_assoc();
    $taskStmt->close();
    
    $taskPrice = isset($taskData['price']) ? (float)$taskData['price'] : 0;
    $escrowId = $taskData['escrow_id'] ?? null;
    $escrowSecret = $taskData['escrow_secret'] ?? null;
    $clientWallet = $taskData['client_wallet'] ?? null;
    $workerWallet = $taskData['worker_wallet'] ?? null;
    
    // Construir objeto de resolución con toda la información
    $resolutionData = [
        'decision' => $decision,
        'reason' => $reason,
        'resolved_at' => date('Y-m-d H:i:s'),
        'resolved_by' => $user['id'],
        'resolved_by_username' => $user['username'] ?? 'Admin'
    ];
    
    // Calcular montos según la decisión
    if ($decision === 'client') {
        // Reembolso completo al cliente
        $resolutionData['refund_to_client'] = $taskPrice;
        $resolutionData['pay_to_worker'] = 0;
        $resolutionData['refund_percentage'] = 100;
    } elseif ($decision === 'worker') {
        // Pago completo al trabajador
        $resolutionData['refund_to_client'] = 0;
        $resolutionData['pay_to_worker'] = $taskPrice;
        $resolutionData['refund_percentage'] = 0;
    } elseif ($decision === 'split') {
        // División según porcentaje
        $refundAmount = $taskPrice * ($refundPercentage / 100);
        $payAmount = $taskPrice - $refundAmount;
        $resolutionData['refund_to_client'] = round($refundAmount, 8);
        $resolutionData['pay_to_worker'] = round($payAmount, 8);
        $resolutionData['refund_percentage'] = $refundPercentage;
    }
    
    // Convertir a JSON
    $resolutionJson = json_encode($resolutionData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
    // Actualizar disputa con resolución completa en JSON
    $updateStmt = $conn->prepare("UPDATE disputes SET status = 'resolved', resolution = ?, resolved_by = ?, resolved_at = NOW() WHERE id = ?");
    $updateStmt->bind_param("sii", $resolutionJson, $user['id'], $disputeId);
    
    if (!$updateStmt->execute()) {
        $updateStmt->close();
        throw new Exception('Error al resolver disputa: ' . $updateStmt->error);
    }
    $updateStmt->close();
    
    // Actualizar estado de la tarea según la decisión
    // Si es a favor del cliente, la tarea se cancela; si es a favor del trabajador o split, se completa
    if ($decision === 'client') {
        $taskStatus = 'cancelled';
    } else {
        $taskStatus = 'completed';
    }
    
    $taskUpdateStmt = $conn->prepare("UPDATE tasks SET status = ? WHERE id = ?");
    $taskUpdateStmt->bind_param("si", $taskStatus, $dispute['task_id']);
    $taskUpdateStmt->execute();
    $taskUpdateStmt->close();
    
    // Intentar liberar fondos del escrow si existe y está activo
    $fundsReleaseInfo = null;
    if (!empty($escrowId) && !empty($escrowSecret) && isset($taskData['escrow_status']) && $taskData['escrow_status'] === 'active') {
        try {
            // Preparar información para liberar fondos
            // Nota: La liberación real de fondos debe hacerse desde el frontend con las firmas necesarias
            // Aquí solo preparamos la información necesaria
            $fundsReleaseInfo = [
                'escrow_id' => $escrowId,
                'escrow_secret' => $escrowSecret, // Solo para generar XDR, no se envía al frontend
                'client_wallet' => $clientWallet,
                'worker_wallet' => $workerWallet,
                'needs_refund' => ($decision === 'client'),
                'needs_payment' => ($decision === 'worker'),
                'needs_split' => ($decision === 'split'),
                'refund_amount' => $decision === 'client' ? $taskPrice : ($decision === 'split' ? $resolutionData['refund_to_client'] : 0),
                'payment_amount' => $decision === 'worker' ? $taskPrice : ($decision === 'split' ? $resolutionData['pay_to_worker'] : 0)
            ];
            
            // Actualizar estado del escrow para indicar que necesita liberación
            $escrowStatusUpdate = $conn->prepare("UPDATE tasks SET escrow_status = 'pending_dispute_resolution' WHERE id = ?");
            $escrowStatusUpdate->bind_param("i", $dispute['task_id']);
            $escrowStatusUpdate->execute();
            $escrowStatusUpdate->close();
            
        } catch (Exception $e) {
            error_log("Error al preparar liberación de fondos para disputa {$disputeId}: " . $e->getMessage());
            // Continuar aunque falle la preparación de liberación de fondos
        }
    }
    
    logAdminAction($conn, $user['id'], 'resolve_dispute', 'dispute', $disputeId, [
        'decision' => $decision,
        'reason' => $reason,
        'refund_percentage' => $refundPercentage,
        'task_id' => $dispute['task_id'],
        'funds_release_required' => !empty($fundsReleaseInfo)
    ]);
    
    $response = [
        'success' => true,
        'message' => 'Disputa resuelta correctamente',
        'dispute_id' => $disputeId
    ];
    
    // Agregar información sobre liberación de fondos si es necesaria
    if (!empty($fundsReleaseInfo)) {
        $response['funds_release_required'] = true;
        $response['funds_release_info'] = [
            'escrow_id' => $fundsReleaseInfo['escrow_id'],
            'client_wallet' => $fundsReleaseInfo['client_wallet'],
            'worker_wallet' => $fundsReleaseInfo['worker_wallet'],
            'needs_refund' => $fundsReleaseInfo['needs_refund'],
            'needs_payment' => $fundsReleaseInfo['needs_payment'],
            'needs_split' => $fundsReleaseInfo['needs_split'],
            'refund_amount' => $fundsReleaseInfo['refund_amount'],
            'payment_amount' => $fundsReleaseInfo['payment_amount'],
            'message' => 'Los fondos del escrow necesitan ser liberados. Por favor, usa el panel de administración para completar la transacción.'
        ];
    }
    
    return $response;
}

