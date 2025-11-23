<?php
/**
 * Script simple para verificar si hay disputas reales en el sistema
 * Accede desde: http://arcusx.one/api/auth/check_disputes.php
 */

require_once 'config.php';

header('Content-Type: application/json; charset=UTF-8');

try {
    // Verificar si la tabla existe
    $tableCheck = $conn->query("SHOW TABLES LIKE 'disputes'");
    if ($tableCheck->num_rows === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'La tabla disputes no existe. Ejecuta el script create_admin_tables.sql primero.'
        ]);
        exit;
    }
    
    // Contar total de disputas
    $countStmt = $conn->query("SELECT COUNT(*) as total FROM disputes");
    $totalCount = $countStmt->fetch_assoc()['total'];
    
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
    
    $disputes = [];
    while ($row = $stmt->fetch_assoc()) {
        $disputes[] = $row;
    }
    
    // Contar por estado
    $pendingStmt = $conn->query("SELECT COUNT(*) as total FROM disputes WHERE status = 'pending'");
    $pendingCount = $pendingStmt->fetch_assoc()['total'];
    
    $resolvedStmt = $conn->query("SELECT COUNT(*) as total FROM disputes WHERE status = 'resolved'");
    $resolvedCount = $resolvedStmt->fetch_assoc()['total'];
    
    echo json_encode([
        'success' => true,
        'total_disputes' => (int)$totalCount,
        'pending' => (int)$pendingCount,
        'resolved' => (int)$resolvedCount,
        'disputes' => $disputes,
        'message' => $totalCount > 0 
            ? "Hay {$totalCount} disputa(s) en el sistema ({$pendingCount} pendientes, {$resolvedCount} resueltas). Puedes probar con estas desde el panel de admin."
            : 'No hay disputas en el sistema. Ejecuta create_test_dispute.php para crear una de prueba.'
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}

$conn->close();
?>

