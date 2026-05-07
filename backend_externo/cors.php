<?php

function cors_get_origin(): string {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://arcusx.pro',
        'http://arcusx.pro',
    ];
    return in_array($origin, $allowed, true) ? $origin : 'https://arcusx.pro';
}

function cors_headers(string $methods = 'GET, POST, OPTIONS'): void {
    $origin = cors_get_origin();
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: ' . $methods);
    header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
    header('Access-Control-Max-Age: 3600');
}

function cors_preflight(string $methods = 'GET, POST, OPTIONS'): void {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        cors_headers($methods);
        header('Content-Length: 0');
        header('Content-Type: text/plain');
        http_response_code(200);
        exit();
    }
}


