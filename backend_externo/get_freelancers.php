<?php
/**
 * get_freelancers.php
 * Endpoint para obtener lista de freelancers con perfiles públicos
 * GET /api/auth/get_freelancers.php?page=1&limit=20&search=nombre&min_rating=4&min_tasks=5&sort_by=rating&sort_order=desc&prefer_profile=1
 * prefer_profile=1: ordena primero por perfil completo (foto, bio, skills) y luego por sort_by (p. ej. landing sin KYC).
 * Headers: Authorization: Bearer {JWT_TOKEN} (opcional)
 */

require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('GET, OPTIONS');

require_once __DIR__ . '/config.php';

arcusx_cors_apply('GET, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Parámetros de paginación
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 20;
        $offset = ($page - 1) * $limit;

        // Parámetros de búsqueda y filtros
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $minRating = isset($_GET['min_rating']) ? (float)$_GET['min_rating'] : 0;
        $minTasks = isset($_GET['min_tasks']) ? max(0, (int)$_GET['min_tasks']) : 0;
        
        // Priorizar perfiles con foto/bio/skills (p. ej. carrusel landing; no implica KYC)
        $preferProfile = isset($_GET['prefer_profile']) && ($_GET['prefer_profile'] === '1' || $_GET['prefer_profile'] === 'true');

        // Parámetros de ordenamiento
        $sortBy = isset($_GET['sort_by']) ? $_GET['sort_by'] : 'rating';
        $sortOrder = isset($_GET['sort_order']) && strtoupper($_GET['sort_order']) === 'ASC' ? 'ASC' : 'DESC';
        
        // Validar sort_by
        $allowedSortBy = ['rating', 'tasks_completed', 'joined_date', 'total_earned'];
        if (!in_array($sortBy, $allowedSortBy)) {
            $sortBy = 'rating';
        }

        // Obtener platform fee para cálculos
        $platformFee = 0.03; // default 3%
        try {
            $feeRes = $conn->query("SHOW TABLES LIKE 'system_config'");
            if ($feeRes && $feeRes->num_rows > 0) {
                $cfg = $conn->query("SELECT config_value FROM system_config WHERE config_key = 'platform_fee'");
                if ($cfg && $cfg->num_rows > 0) {
                    $rowCfg = $cfg->fetch_assoc();
                    if (is_numeric($rowCfg['config_value'])) {
                        $platformFee = (float)$rowCfg['config_value'];
                    }
                }
            }
        } catch (Exception $e) {
            error_log("Error obteniendo platform_fee en get_freelancers.php: " . $e->getMessage());
        }

        // Construir query base con subqueries
        $sqlBase = "
            FROM users u
            LEFT JOIN (
                SELECT 
                    rated_id as user_id,
                    AVG(rating) as avg_rating,
                    COUNT(*) as total_ratings
                FROM ratings
                GROUP BY rated_id
            ) r ON u.id = r.user_id
            LEFT JOIN (
                SELECT 
                    accepted_applicant_id as user_id,
                    COUNT(*) as tasks_completed
                FROM tasks
                WHERE accepted_applicant_id IS NOT NULL
                    AND status = 'completed' 
                    AND escrow_status = 'completed'
                GROUP BY accepted_applicant_id
            ) tc ON u.id = tc.user_id
            LEFT JOIN (
                SELECT 
                    t.accepted_applicant_id as user_id,
                    SUM(COALESCE(t.price, 0)) as total_earned
                FROM tasks t
                WHERE t.accepted_applicant_id IS NOT NULL
                    AND t.status = 'completed' 
                    AND t.escrow_status = 'completed'
                GROUP BY t.accepted_applicant_id
            ) te ON u.id = te.user_id
            WHERE u.public_profile = 1
                AND (u.is_admin = 0 OR u.is_admin IS NULL)
        ";

        // Parámetros para bind (ya no necesitamos platformFee en la query)
        $bindParams = [];
        $bindTypes = '';
        $whereConditions = [];

        // Filtro de búsqueda por nombre
        if (!empty($search)) {
            $whereConditions[] = "u.username LIKE ?";
            $bindParams[] = '%' . $search . '%';
            $bindTypes .= 's';
        }

        // Filtro de tareas mínimas
        if ($minTasks > 0) {
            $whereConditions[] = "COALESCE(tc.tasks_completed, 0) >= ?";
            $bindParams[] = $minTasks;
            $bindTypes .= 'i';
        }

        // Filtro de rating mínimo (usar WHERE en lugar de HAVING)
        if ($minRating > 0) {
            $whereConditions[] = "COALESCE(r.avg_rating, 0) >= ?";
            $bindParams[] = $minRating;
            $bindTypes .= 'd';
        }

        // Agregar condiciones WHERE
        if (!empty($whereConditions)) {
            $sqlBase .= " AND " . implode(" AND ", $whereConditions);
        }

        // Query para contar total (para paginación)
        $sqlCount = "SELECT COUNT(DISTINCT u.id) as total " . $sqlBase;
        $bindParamsCount = $bindParams;
        $bindTypesCount = $bindTypes;

        $stmtCount = $conn->prepare($sqlCount);
        if ($stmtCount === false) {
            throw new Exception('Error al preparar consulta de conteo: ' . $conn->error);
        }
        
        if (!empty($bindParamsCount)) {
            $stmtCount->bind_param($bindTypesCount, ...$bindParamsCount);
        }
        $stmtCount->execute();
        $resultCount = $stmtCount->get_result();
        $countRow = $resultCount->fetch_assoc();
        $total = (int)$countRow['total'];
        $stmtCount->close();

        // Verificar si existe columna skills en users (antes del ORDER BY del listado)
        $checkSkills = $conn->query("SHOW COLUMNS FROM users LIKE 'skills'");
        $hasSkillsColumn = $checkSkills && $checkSkills->num_rows > 0;

        // Query principal para obtener freelancers
        $skillsSelect = $hasSkillsColumn ? ", u.skills" : "";
        $sqlSelect = "
            SELECT 
                u.id,
                u.username,
                u.avatar_url,
                u.bio
                $skillsSelect,
                COALESCE(r.avg_rating, 0) as average_rating,
                COALESCE(r.total_ratings, 0) as total_ratings,
                COALESCE(tc.tasks_completed, 0) as tasks_completed,
                COALESCE(te.total_earned, 0) as total_earned,
                u.public_profile,
                u.created_at as joined_date
        " . $sqlBase;

        // Los filtros ya están en WHERE, no necesitamos HAVING
        $bindParamsSelect = $bindParams;
        $bindTypesSelect = $bindTypes;

        // Agregar ordenamiento
        $orderColumn = '';
        switch ($sortBy) {
            case 'rating':
                $orderColumn = 'average_rating';
                break;
            case 'tasks_completed':
                $orderColumn = 'tasks_completed';
                break;
            case 'joined_date':
                $orderColumn = 'u.created_at';
                break;
            case 'total_earned':
                $orderColumn = 'total_earned';
                break;
            default:
                $orderColumn = 'average_rating';
        }

        $sqlSelect .= ' ORDER BY ';
        if ($preferProfile) {
            // Peso fuerte: foto y bio primero; skills como refuerzo. Luego el criterio habitual (rating, etc.).
            $profileScore = "(CASE WHEN u.avatar_url IS NOT NULL AND TRIM(u.avatar_url) != '' THEN 1 ELSE 0 END) * 1000"
                . " + (CASE WHEN u.bio IS NOT NULL AND TRIM(COALESCE(u.bio, '')) != '' THEN 1 ELSE 0 END) * 500";
            if ($hasSkillsColumn) {
                $profileScore .= " + (CASE WHEN u.skills IS NOT NULL AND TRIM(COALESCE(u.skills, '')) != '' AND TRIM(u.skills) != '[]' THEN 1 ELSE 0 END) * 200";
            }
            $sqlSelect .= $profileScore . ' DESC, ' . $orderColumn . ' ' . $sortOrder . ', tasks_completed DESC';
        } else {
            $sqlSelect .= $orderColumn . ' ' . $sortOrder;
        }

        // Agregar paginación
        $sqlSelect .= " LIMIT ? OFFSET ?";
        $bindParamsSelect[] = $limit;
        $bindParamsSelect[] = $offset;
        $bindTypesSelect .= 'ii';

        // Ejecutar query principal
        $stmt = $conn->prepare($sqlSelect);
        if ($stmt === false) {
            throw new Exception('Error al preparar consulta de freelancers: ' . $conn->error);
        }

        if (!empty($bindParamsSelect)) {
            $stmt->bind_param($bindTypesSelect, ...$bindParamsSelect);
        }

        $stmt->execute();
        $result = $stmt->get_result();

        $freelancers = [];
        while ($row = $result->fetch_assoc()) {
            $freelancer = [
                'id' => (int)$row['id'],
                'username' => fix_utf8_mojibake($row['username'] ?? ''),
                'avatar_url' => $row['avatar_url'] ? $row['avatar_url'] : null,
                'bio' => isset($row['bio']) && $row['bio'] ? fix_utf8_mojibake($row['bio']) : null,
                'average_rating' => round((float)$row['average_rating'], 2),
                'total_ratings' => (int)$row['total_ratings'],
                'tasks_completed' => (int)$row['tasks_completed'],
                'total_earned' => round((float)$row['total_earned'], 2),
                'public_profile' => (bool)$row['public_profile'],
                'joined_date' => $row['joined_date']
            ];

            // Obtener habilidades/skills del usuario
            if ($hasSkillsColumn && isset($row['skills']) && !empty($row['skills'])) {
                // Intentar decodificar JSON si está almacenado como JSON
                $skillsData = json_decode($row['skills'], true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($skillsData)) {
                    $freelancer['skills'] = $skillsData;
                } else {
                    // Si es un string separado por comas
                    $skillsArray = array_filter(array_map('trim', explode(',', $row['skills'])));
                    $freelancer['skills'] = !empty($skillsArray) ? array_values($skillsArray) : [];
                }
            } else {
                $freelancer['skills'] = [];
            }

            $freelancers[] = $freelancer;
        }
        $stmt->close();

        // Calcular total de páginas
        $totalPages = $total > 0 ? ceil($total / $limit) : 0;

        // Respuesta exitosa
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'freelancers' => $freelancers,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => $totalPages
            ]
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    } catch (Exception $e) {
        error_log("Error en get_freelancers.php: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al obtener freelancers: ' . $e->getMessage()
        ]);
    } finally {
        if (isset($conn)) {
            $conn->close();
        }
    }
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido'
    ]);
}

