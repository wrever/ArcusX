<?php
/**
 * Script para crear/verificar disputas de prueba
 * Accede desde: http://arcusx.pro/api/auth/create_test_dispute.php
 * 
 * Para solo verificar disputas: ?action=check
 * Para crear disputa: ?action=create (o sin parámetro)
 * IMPORTANTE: Borra este archivo después de probar
 */

require_once 'config.php';

header('Content-Type: application/json; charset=UTF-8');

$action = $_GET['action'] ?? 'create';

// Si es acción de verificación, mostrar disputas existentes
if ($action === 'check') {
    try {
        // Verificar si la tabla existe
        $tableCheck = $conn->query("SHOW TABLES LIKE 'disputes'");
        if ($tableCheck === false) {
            throw new Exception('Error al verificar tabla: ' . $conn->error);
        }
        
        if ($tableCheck->num_rows === 0) {
            echo json_encode([
                'success' => false,
                'message' => 'La tabla disputes no existe. Ejecuta el script create_admin_tables.sql primero.'
            ], JSON_PRETTY_PRINT);
            $conn->close();
            exit;
        }
        $tableCheck->close();
        
        // Contar total de disputas
        $countStmt = $conn->query("SELECT COUNT(*) as total FROM disputes");
        if ($countStmt === false) {
            throw new Exception('Error al contar disputas: ' . $conn->error);
        }
        $totalCount = $countStmt->fetch_assoc()['total'];
        $countStmt->close();
        
        // Verificar disputas existentes
        $stmt = $conn->query("
            SELECT 
                d.id,
                d.status,
                d.reason,
                d.created_at,
                t.id as task_id,
                t.title as task_title,
                t.price as task_price,
                u.username as created_by_username,
                u.email as created_by_email
            FROM disputes d
            LEFT JOIN tasks t ON d.task_id = t.id
            LEFT JOIN users u ON d.created_by = u.id
            ORDER BY d.created_at DESC
            LIMIT 10
        ");
        
        if ($stmt === false) {
            throw new Exception('Error al obtener disputas: ' . $conn->error);
        }
        
        $disputes = [];
        while ($row = $stmt->fetch_assoc()) {
            $disputes[] = $row;
        }
        $stmt->close();
        
        // Contar por estado
        $pendingStmt = $conn->query("SELECT COUNT(*) as total FROM disputes WHERE status = 'pending'");
        if ($pendingStmt === false) {
            $pendingCount = 0;
        } else {
            $pendingCount = $pendingStmt->fetch_assoc()['total'];
            $pendingStmt->close();
        }
        
        $resolvedStmt = $conn->query("SELECT COUNT(*) as total FROM disputes WHERE status = 'resolved'");
        if ($resolvedStmt === false) {
            $resolvedCount = 0;
        } else {
            $resolvedCount = $resolvedStmt->fetch_assoc()['total'];
            $resolvedStmt->close();
        }
        
        echo json_encode([
            'success' => true,
            'action' => 'check',
            'total_disputes' => (int)$totalCount,
            'pending' => (int)$pendingCount,
            'resolved' => (int)$resolvedCount,
            'disputes' => $disputes,
            'message' => $totalCount > 0 
                ? "Hay {$totalCount} disputa(s) en el sistema ({$pendingCount} pendientes, {$resolvedCount} resueltas)."
                : 'No hay disputas en el sistema.'
        ], JSON_PRETTY_PRINT);
        
        $conn->close();
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error: ' . $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ], JSON_PRETTY_PRINT);
        if (isset($conn)) {
            $conn->close();
        }
        exit;
    } catch (Error $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error fatal: ' . $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ], JSON_PRETTY_PRINT);
        if (isset($conn)) {
            $conn->close();
        }
        exit;
    }
}

// Acción por defecto: crear disputa
try {
    // 1. Obtener un usuario existente
    $userStmt = $conn->query("SELECT id, username FROM users LIMIT 1");
    if ($userStmt->num_rows === 0) {
        throw new Exception('No hay usuarios en la base de datos');
    }
    $user = $userStmt->fetch_assoc();
    $userStmt->close();
    
    // 2. Obtener o crear una tarea
    $taskStmt = $conn->query("SELECT id, title, price FROM tasks LIMIT 1");
    $task = null;
    
    if ($taskStmt->num_rows === 0) {
        // Crear tarea de prueba
        $createTaskStmt = $conn->prepare("
            INSERT INTO tasks (title, subtitle, description, price, currency, difficulty, category, user_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $title = 'Tarea de Prueba para Disputa';
        $subtitle = 'Test';
        $description = 'Tarea creada para probar el sistema de disputas';
        $price = 10.0;
        $currency = 'USDC';
        $difficulty = 'medium';
        $category = 'testing';
        $status = 'in_progress';
        
        $createTaskStmt->bind_param("sssdsssss", 
            $title, $subtitle, $description, $price, $currency, 
            $difficulty, $category, $user['id'], $status
        );
        
        if (!$createTaskStmt->execute()) {
            throw new Exception('Error al crear tarea: ' . $createTaskStmt->error);
        }
        
        $task = [
            'id' => $conn->insert_id,
            'title' => $title,
            'price' => $price
        ];
        $createTaskStmt->close();
    } else {
        $task = $taskStmt->fetch_assoc();
    }
    $taskStmt->close();
    
    // 3. Verificar si ya existe una disputa de prueba
    $checkStmt = $conn->prepare("SELECT id FROM disputes WHERE reason LIKE '%prueba%' OR reason LIKE '%test%' LIMIT 1");
    $checkStmt->execute();
    $existing = $checkStmt->get_result()->fetch_assoc();
    $checkStmt->close();
    
    if ($existing) {
        echo json_encode([
            'success' => true,
            'message' => 'Ya existe una disputa de prueba',
            'dispute_id' => $existing['id'],
            'instructions' => [
                '1. Ve al panel de admin: http://localhost:5173/admin/dashboard',
                '2. Ve a la pestaña "Arbitraje"',
                '3. Busca la disputa con ID: ' . $existing['id'],
                '4. Prueba resolverla con las 3 opciones',
                '5. Para borrarla después, ejecuta: DELETE FROM disputes WHERE id = ' . $existing['id']
            ]
        ]);
        exit;
    }
    
    // 4. Crear la disputa de prueba
    $disputeStmt = $conn->prepare("INSERT INTO disputes (task_id, created_by, reason, status) VALUES (?, ?, ?, 'pending')");
    $reason = 'Disputa de prueba - El trabajador no cumplió con los requisitos acordados. Esta es una disputa de prueba que puedes borrar después.';
    
    $disputeStmt->bind_param("iis", $task['id'], $user['id'], $reason);
    
    if (!$disputeStmt->execute()) {
        throw new Exception('Error al crear disputa: ' . $disputeStmt->error);
    }
    
    $disputeId = $conn->insert_id;
    $disputeStmt->close();
    
    echo json_encode([
        'success' => true,
        'message' => 'Disputa de prueba creada exitosamente',
        'dispute_id' => $disputeId,
        'data' => [
            'dispute_id' => $disputeId,
            'task_id' => $task['id'],
            'task_title' => $task['title'],
            'task_price' => $task['price'],
            'created_by' => $user['username']
        ],
        'instructions' => [
            '1. Ve al panel de admin: http://localhost:5173/admin/dashboard',
            '2. Ve a la pestaña "Arbitraje"',
            '3. Deberías ver la disputa con ID: ' . $disputeId,
            '4. Haz clic en "Ver" para ver los detalles',
            '5. Haz clic en "Resolver Disputa" y prueba las 3 opciones:',
            '   - A favor del Cliente',
            '   - A favor del Trabajador',
            '   - División (split)',
            '6. Para borrarla después, ejecuta en la base de datos:',
            '   DELETE FROM disputes WHERE id = ' . $disputeId
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}

$conn->close();
?>

