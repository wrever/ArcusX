<?php

$db_password = getenv('ARCUSX_DB_PASSWORD');
$jwt_secret  = getenv('ARCUSX_JWT_SECRET');

if ($db_password === false || $db_password === '') {
    http_response_code(500);
    echo json_encode(['message' => 'Error de configuración del servidor: ARCUSX_DB_PASSWORD no definida.']);
    exit;
}
if ($jwt_secret === false || $jwt_secret === '') {
    http_response_code(500);
    echo json_encode(['message' => 'Error de configuración del servidor: ARCUSX_JWT_SECRET no definida.']);
    exit;
}

$db_config = [
    'host'     => 'localhost',
    'user'     => 'arcusxon_owner',
    'password' => $db_password,
    'database' => 'arcusxon_users'
];

// Definir constantes para compatibilidad con get_task_details.php
define('DB_HOST', $db_config['host']);
define('DB_USER', $db_config['user']);
define('DB_PASS', $db_config['password']);
define('DB_NAME', $db_config['database']);

$conn = new mysqli($db_config['host'], $db_config['user'], $db_config['password'], $db_config['database']);

if ($conn->connect_error) {
    throw new Exception('Error de conexión a la base de datos: ' . $conn->connect_error);
}

// PHP 8.1: charset UTF-8 para tildes y ñ correctos.
$conn->set_charset('utf8mb4');

/**
 * Repara solo un caso: texto UTF-8 que en realidad son bytes UTF-8 interpretados como Latin-1
 * (ej. "PeÃ±a" → "Peña", "tÃ©cnico" → "técnico"). Una sola pasada ISO-8859-1 → UTF-8.
 * No toca: UTF-8 ya correcto (no hay secuencia Ã+byte), ni triple mojibake (ÃƒÂ…).
 */
if (!function_exists('fix_utf8_mojibake')) {
    function fix_utf8_mojibake($str) {
        if (!is_string($str)) {
            return '';
        }
        if ($str === '') {
            return $str;
        }
        if (!mb_check_encoding($str, 'UTF-8')) {
            return $str;
        }
        // Doble/triple conversión previa: no intentar (empeora)
        if (strpos($str, 'Ãƒ') !== false) {
            return $str;
        }
        // UTF-8 de 2 bytes mal leído como Latin-1: p. ej. "Ã±" (C3 B1 → ñ), "Ã" + U+0091 → Ñ.
        // Rango de continuación UTF-8: U+0080–U+00BF (no solo A1–FF, para no omitir Ñ, etc.).
        if (!preg_match('/Ã[\x{0080}-\x{00BF}]/u', $str) && !preg_match('/Â[\x{0080}-\x{00BF}]/u', $str)) {
            return $str;
        }
        $fixed = @mb_convert_encoding($str, 'UTF-8', 'ISO-8859-1');
        if ($fixed === false || $fixed === '' || !mb_check_encoding($fixed, 'UTF-8')) {
            return $str;
        }
        $bad = substr_count($str, 'Ã');
        $badFixed = substr_count($fixed, 'Ã');
        if ($badFixed < $bad) {
            return $fixed;
        }
        return $str;
    }
}
