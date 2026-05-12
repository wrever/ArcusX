<?php
/**
 * Endpoint para subir avatar/foto de perfil
 * POST /api/auth/upload_avatar.php
 * Content-Type: multipart/form-data
 * Headers: Authorization: Bearer {JWT_TOKEN}
 * Campo: file (imagen)
 */

require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('POST, OPTIONS');
require_once 'config.php';

$autoload_path = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoload_path)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en el servidor: Falta la carpeta de dependencias (vendor).'
    ]);
    exit();
}
require $autoload_path;
require_once __DIR__ . '/auth_bearer.php';

arcusx_cors_apply('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido'
    ]);
    exit();
}

$userId = arcusx_jwt_user_id();
if ($userId === null) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Acceso no autorizado: Token JWT no proporcionado o inválido.'
    ]);
    $conn->close();
    exit();
}

// Asegurar columna avatar_url
try {
    $check = $conn->query("SHOW COLUMNS FROM users LIKE 'avatar_url'");
    if ($check && $check->num_rows === 0) {
        $conn->query("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL");
    }
} catch (Exception $e) {
    error_log("Error asegurando columna avatar_url: " . $e->getMessage());
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'No se recibió archivo o hubo un error en la subida'
    ]);
    $conn->close();
    exit();
}

$file = $_FILES['file'];

// Validar tipo MIME
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Tipo de archivo no permitido. Usa JPG, PNG o WEBP'
    ]);
    $conn->close();
    exit();
}

// Validar tamaño (máx 5MB)
$maxSize = 5 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'El archivo es demasiado grande. Máximo 5MB'
    ]);
    $conn->close();
    exit();
}

// Directorio de subida - usar la ruta correcta files/avatars (público, en la raíz del servidor web)
// El directorio debe estar en la raíz del servidor web, no dentro de api/
// Usar DOCUMENT_ROOT para obtener la raíz del servidor web
$uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/files/avatars/';

// Intentar crear el directorio si no existe
if (!is_dir($uploadDir)) {
    if (!@mkdir($uploadDir, 0755, true)) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al crear directorio de avatares. Verifique permisos del servidor. Ruta intentada: ' . $uploadDir
        ]);
        $conn->close();
        exit();
    }
}

// Verificar permisos de escritura
if (!is_writable($uploadDir)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'El directorio de avatares no tiene permisos de escritura. Ruta: ' . $uploadDir
    ]);
    $conn->close();
    exit();
}

$extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$fileName = $userId . '_' . time() . '_' . uniqid() . '.' . $extension;
$destPath = $uploadDir . $fileName;

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    http_response_code(500);
    $errorDetails = error_get_last();
    echo json_encode([
        'success' => false,
        'message' => 'Error al guardar el archivo en el servidor. Destino: ' . $destPath . '. Error: ' . ($errorDetails ? $errorDetails['message'] : 'Error desconocido')
    ]);
    $conn->close();
    exit();
}

// Construir URL pública relativa - usar la ruta correcta /files/avatars/
$avatarUrl = '/files/avatars/' . $fileName;

// Borrar avatar anterior si es local (ANTES de actualizar la BD)
$stmtOld = $conn->prepare("SELECT avatar_url FROM users WHERE id = ?");
if ($stmtOld) {
    $stmtOld->bind_param("i", $userId);
    $stmtOld->execute();
    $resOld = $stmtOld->get_result();
    if ($resOld && $resOld->num_rows > 0) {
        $row = $resOld->fetch_assoc();
        if (!empty($row['avatar_url'])) {
            $oldAvatarUrl = $row['avatar_url'];
            $oldPath = null;
            
            // Si es una URL completa (http/https), no intentar borrar (puede ser de Supabase u otro servicio externo)
            if (strpos($oldAvatarUrl, 'http://') === 0 || strpos($oldAvatarUrl, 'https://') === 0) {
                // Es una URL externa, no borrar
            } 
            // Si es una ruta local relativa, construir la ruta completa
            elseif (strpos($oldAvatarUrl, '/files/avatars/') === 0) {
                // Ruta nueva correcta: /files/avatars/filename.jpg
                $oldPath = $_SERVER['DOCUMENT_ROOT'] . $oldAvatarUrl;
            } 
            elseif (strpos($oldAvatarUrl, '/api/files/avatars/') === 0) {
                // Ruta incorrecta guardada anteriormente: /api/files/avatars/filename.jpg
                // Convertir a la ruta correcta sin /api
                $oldPath = $_SERVER['DOCUMENT_ROOT'] . str_replace('/api/files/', '/files/', $oldAvatarUrl);
            }
            elseif (strpos($oldAvatarUrl, '/api/uploads/avatars/') === 0) {
                // Ruta antigua: /api/uploads/avatars/filename.jpg (para compatibilidad)
                $oldPath = $_SERVER['DOCUMENT_ROOT'] . str_replace('/api/uploads/', '/files/', $oldAvatarUrl);
            }
            
            // Intentar borrar el archivo anterior si existe
            if ($oldPath && file_exists($oldPath) && is_file($oldPath)) {
                @unlink($oldPath);
            }
        }
    }
    $stmtOld->close();
}

// Actualizar en BD
$stmt = $conn->prepare("UPDATE users SET avatar_url = ? WHERE id = ?");
if ($stmt === false) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al preparar actualización de avatar: ' . $conn->error
    ]);
    $conn->close();
    exit();
}

$stmt->bind_param("si", $avatarUrl, $userId);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al actualizar avatar en la base de datos: ' . $stmt->error
    ]);
    $stmt->close();
    $conn->close();
    exit();
}

$stmt->close();

// Verificar que el archivo realmente existe antes de confirmar
if (!file_exists($destPath)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: El archivo no se guardó correctamente en el servidor. Ruta: ' . $destPath
    ]);
    $conn->close();
    exit();
}

http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Avatar actualizado correctamente',
    'avatar_url' => $avatarUrl
]);

$conn->close();


