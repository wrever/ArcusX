<?php
// task_stats.php
// Obtiene estadísticas de tareas del usuario

// CORS headers - DEBEN IR PRIMERO, ANTES DE CUALQUIER OTRO OUTPUT
$allowed_origins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://arcusx.pro',
    'http://arcusx.pro'
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

// Manejar preflight OPTIONS request PRIMERO
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    }
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 3600");
    header("Content-Length: 0");
    http_response_code(200);
    exit();
}

// Headers CORS para requests normales
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Habilitar logs (pero NO mostrar errores en pantalla para evitar output antes de headers)
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

require_once 'config.php';

try {
    // Verificar que el método sea GET
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido. Solo se permite GET.'], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // Obtener el user_id de los parámetros GET
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;

    if (!$user_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'user_id requerido'], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // Verificar si se solicita reset de límites
    if (isset($_GET['reset']) && $_GET['reset'] === 'true') {
        $sql = "UPDATE user_task_limits SET 
                tasks_today = 0, 
                tasks_this_week = 0, 
                cooldown_until = NULL,
                updated_at = CURRENT_TIMESTAMP 
                WHERE user_id = $user_id";
        
        if ($conn->query($sql)) {
            echo json_encode([
                'success' => true,
                'message' => 'Límites reseteados exitosamente',
                'user_id' => $user_id,
                'tasks_today' => 0,
                'tasks_this_week' => 0,
                'cooldown_until' => null
            ], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error al resetear límites: ' . $conn->error], JSON_UNESCAPED_UNICODE);
        }
        exit();
    }

    // Verificar si se solicita configurar cooldown para testing
    if (isset($_GET['set_cooldown']) && is_numeric($_GET['set_cooldown'])) {
        $cooldown_seconds = intval($_GET['set_cooldown']);
        
        // Validar rango (30 segundos a 2 horas)
        if ($cooldown_seconds < 30 || $cooldown_seconds > 7200) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Cooldown debe estar entre 30 segundos y 7200 segundos (2 horas)'], JSON_UNESCAPED_UNICODE);
            exit();
        }
        
        $cooldown_until = date('Y-m-d H:i:s', time() + $cooldown_seconds);
        
        // Verificar si existe el usuario en user_task_limits
        $check_limits = $conn->query("SELECT * FROM user_task_limits WHERE user_id = $user_id");
        
        if ($check_limits->num_rows > 0) {
            // Usuario existe, actualizar cooldown
            $sql = "UPDATE user_task_limits SET cooldown_until = '$cooldown_until', updated_at = CURRENT_TIMESTAMP WHERE user_id = $user_id";
        } else {
            // Usuario no existe, crear registro
            $sql = "INSERT INTO user_task_limits (user_id, cooldown_until, tasks_today, tasks_this_week) VALUES ($user_id, '$cooldown_until', 0, 0)";
        }
        
        if ($conn->query($sql)) {
            echo json_encode([
                'success' => true,
                'message' => "Cooldown configurado para {$cooldown_seconds} segundos",
                'user_id' => $user_id,
                'cooldown_seconds' => $cooldown_seconds,
                'cooldown_until' => $cooldown_until
            ], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error al configurar cooldown: ' . $conn->error], JSON_UNESCAPED_UNICODE);
        }
        exit();
    }

    // Verificar si se solicita actualizar información de stats y cooldown
    if (isset($_GET['update_info']) && $_GET['update_info'] === 'true') {
        $tasks_today = isset($_GET['tasks_today']) ? intval($_GET['tasks_today']) : null;
        $tasks_this_week = isset($_GET['tasks_this_week']) ? intval($_GET['tasks_this_week']) : null;
        $cooldown_until = isset($_GET['cooldown_until']) ? $_GET['cooldown_until'] : null;
        
        // Validar que al menos un parámetro esté presente
        if ($tasks_today === null && $tasks_this_week === null && $cooldown_until === null) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Debe proporcionar al menos un parámetro: tasks_today, tasks_this_week o cooldown_until'], JSON_UNESCAPED_UNICODE);
            exit();
        }
        
        // Construir la consulta UPDATE dinámicamente
        $update_fields = [];
        
        if ($tasks_today !== null) {
            $update_fields[] = "tasks_today = " . intval($tasks_today);
        }
        
        if ($tasks_this_week !== null) {
            $update_fields[] = "tasks_this_week = " . intval($tasks_this_week);
        }
        
        if ($cooldown_until !== null) {
            if ($cooldown_until === 'NULL' || $cooldown_until === 'null' || $cooldown_until === '') {
                $update_fields[] = "cooldown_until = NULL";
            } else {
                $cooldown_until_escaped = $conn->real_escape_string($cooldown_until);
                $update_fields[] = "cooldown_until = '$cooldown_until_escaped'";
            }
        }
        
        $update_fields[] = "updated_at = CURRENT_TIMESTAMP";
        
        // Verificar si existe el usuario en user_task_limits
        $check_limits = $conn->query("SELECT * FROM user_task_limits WHERE user_id = $user_id");
        
        if ($check_limits->num_rows > 0) {
            // Usuario existe, actualizar
            $sql = "UPDATE user_task_limits SET " . implode(', ', $update_fields) . " WHERE user_id = $user_id";
        } else {
            // Usuario no existe, crear registro
            $tasks_today_val = $tasks_today !== null ? intval($tasks_today) : 0;
            $tasks_this_week_val = $tasks_this_week !== null ? intval($tasks_this_week) : 0;
            $cooldown_val = ($cooldown_until !== null && $cooldown_until !== 'NULL' && $cooldown_until !== 'null' && $cooldown_until !== '') 
                ? "'" . $conn->real_escape_string($cooldown_until) . "'" 
                : 'NULL';
            $sql = "INSERT INTO user_task_limits (user_id, tasks_today, tasks_this_week, cooldown_until) VALUES ($user_id, $tasks_today_val, $tasks_this_week_val, $cooldown_val)";
        }
        
        if ($conn->query($sql)) {
            echo json_encode([
                'success' => true,
                'message' => 'Información actualizada exitosamente',
                'user_id' => $user_id,
                'updated_fields' => [
                    'tasks_today' => $tasks_today,
                    'tasks_this_week' => $tasks_this_week,
                    'cooldown_until' => $cooldown_until
                ]
            ], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error al actualizar información: ' . $conn->error], JSON_UNESCAPED_UNICODE);
        }
        exit();
    }

    // Inicializar variables con valores por defecto
    $tasks_today = 0;
    $tasks_this_week = 0;
    $cooldown_until_db = null;

    // Contar tareas reales del usuario desde la tabla tasks
    $today = date('Y-m-d');
    $week_start = date('Y-m-d', strtotime('monday this week'));

    // Contar tareas de hoy
    try {
        $today_result = $conn->query("SELECT COUNT(*) as count FROM tasks WHERE user_id = $user_id AND DATE(created_at) = '$today'");
        if ($today_result) {
            $today_row = $today_result->fetch_assoc();
            $tasks_today = isset($today_row['count']) ? intval($today_row['count']) : 0;
        } else {
            error_log("Error contando tareas de hoy: " . ($conn->error ? $conn->error : 'Error desconocido'));
            $tasks_today = 0;
        }
    } catch (Exception $e) {
        error_log("Excepción contando tareas de hoy: " . $e->getMessage());
        $tasks_today = 0;
    }

    // Contar tareas de esta semana
    try {
        $week_result = $conn->query("SELECT COUNT(*) as count FROM tasks WHERE user_id = $user_id AND DATE(created_at) >= '$week_start'");
        if ($week_result) {
            $week_row = $week_result->fetch_assoc();
            $tasks_this_week = isset($week_row['count']) ? intval($week_row['count']) : 0;
        } else {
            error_log("Error contando tareas de esta semana: " . ($conn->error ? $conn->error : 'Error desconocido'));
            $tasks_this_week = 0;
        }
    } catch (Exception $e) {
        error_log("Excepción contando tareas de esta semana: " . $e->getMessage());
        $tasks_this_week = 0;
    }

    // Obtener cooldown desde la tabla users (si la columna existe)
    try {
        // Primero verificar si la columna existe
        $check_column = $conn->query("SHOW COLUMNS FROM users LIKE 'cooldown_until'");
        if ($check_column && $check_column->num_rows > 0) {
            $user_result = $conn->query("SELECT cooldown_until FROM users WHERE id = $user_id");
            if ($user_result) {
                $user_data = $user_result->fetch_assoc();
                if ($user_data && isset($user_data['cooldown_until']) && $user_data['cooldown_until'] !== null) {
                    $cooldown_until_db = $user_data['cooldown_until'];
                }
            } else {
                error_log("Error obteniendo datos del usuario: " . ($conn->error ? $conn->error : 'Error desconocido'));
            }
        } else {
            // La columna no existe, usar null
            $cooldown_until_db = null;
        }
    } catch (Exception $e) {
        error_log("Excepción obteniendo cooldown: " . $e->getMessage());
        $cooldown_until_db = null;
    }

    // Verificar cooldown
    $cooldown_remaining = 0;
    $can_create = true;
    $cooldown_until = null;

    try {
        if ($cooldown_until_db) {
            $cooldown_until = strtotime($cooldown_until_db);
            $current_time = time();
            
            if ($cooldown_until && $current_time < $cooldown_until) {
                $can_create = false;
                $cooldown_remaining = $cooldown_until - $current_time;
            } else {
                // El cooldown ya expiró, limpiar el registro (solo si la columna existe)
                try {
                    $check_column = $conn->query("SHOW COLUMNS FROM users LIKE 'cooldown_until'");
                    if ($check_column && $check_column->num_rows > 0) {
                        $conn->query("UPDATE users SET cooldown_until = NULL WHERE id = $user_id");
                    }
                } catch (Exception $e) {
                    error_log("Excepción limpiando cooldown: " . $e->getMessage());
                }
                $cooldown_until_db = null;
            }
        }
    } catch (Exception $e) {
        error_log("Error verificando cooldown: " . $e->getMessage());
    }

    // Obtener límites máximos desde la configuración (puedes cambiar estos valores)
    $max_tasks_today = 5; // Límite diario
    $max_tasks_week = 50; // Límite semanal

    // Verificar límites diarios/semanales
    $can_create = $can_create && $tasks_today < $max_tasks_today && $tasks_this_week < $max_tasks_week;

    // Logging para debugging
    error_log("Task Stats - User: $user_id, Tasks Today: $tasks_today, Tasks Week: $tasks_this_week, Can Create: " . ($can_create ? 'true' : 'false') . ", Cooldown Remaining: $cooldown_remaining");

    // Devolver los números y el estado
    // Siempre devolver una respuesta válida, incluso si hay errores
    $response_data = [
        'success' => true,
        'tasks_today' => $tasks_today,
        'tasks_this_week' => $tasks_this_week,
        'can_create' => $can_create,
        'cooldown_remaining' => $cooldown_remaining,
        'next_task_time' => $can_create ? 'Ahora' : ($cooldown_until ? date('Y-m-d H:i:s', $cooldown_until) : 'Ahora')
    ];

    http_response_code(200);
    echo json_encode($response_data, JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    error_log('Error en task_stats.php: ' . $e->getMessage());
    
    // Asegurar que los headers CORS se envíen incluso en errores
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    } else {
        header("Access-Control-Allow-Origin: *");
    }
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Content-Type: application/json; charset=UTF-8");
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error al procesar solicitud',
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>
