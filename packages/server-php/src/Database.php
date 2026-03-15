<?php

declare(strict_types=1);

namespace Kryssanu;

use PDO;

class Database
{
    private static ?PDO $instance = null;

    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $url = $_ENV['DATABASE_URL'] ?? getenv('DATABASE_URL');
            if (!$url) {
                throw new \RuntimeException('DATABASE_URL is not set');
            }

            $parsed = parse_url($url);
            if ($parsed === false) {
                throw new \RuntimeException('Invalid DATABASE_URL format');
            }

            $host = $parsed['host'] ?? 'localhost';
            $port = $parsed['port'] ?? 3306;
            $dbname = ltrim($parsed['path'] ?? '', '/');
            $user = $parsed['user'] ?? '';
            $pass = $parsed['pass'] ?? '';

            // Parse query string for additional options (e.g., sslaccept)
            $options = [];
            if (isset($parsed['query'])) {
                parse_str($parsed['query'], $options);
            }

            $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";

            self::$instance = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        }

        return self::$instance;
    }
}
