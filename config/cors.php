<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS)
    |--------------------------------------------------------------------------
    |
    | Hanya frontend yang terdaftar yang boleh mengakses API dari browser.
    |
    */

    'paths' => ['api/*'],

    'allowed_methods' => [
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'OPTIONS',
    ],

    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(
            ',',
            env(
                'CORS_ALLOWED_ORIGINS',
                'http://localhost:5173,http://127.0.0.1:5173'
            )
        )
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => [
        'Accept',
        'Content-Type',
        'Origin',
        'X-Requested-With',
    ],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => false,

];
