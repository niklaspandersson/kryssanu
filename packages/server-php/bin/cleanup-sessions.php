#!/usr/bin/env php
<?php

/**
 * Cleanup expired sessions.
 * Run via cron: 0 0 * * * php /path/to/cleanup-sessions.php
 */

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

// Load .env
$envFile = dirname(__DIR__, 3) . '/.env';
if (file_exists($envFile)) {
    $dotenv = Dotenv\Dotenv::createImmutable(dirname(__DIR__, 3));
    $dotenv->load();
}

use Kryssanu\Database;

$db = Database::getConnection();
$stmt = $db->prepare('DELETE FROM Session WHERE expiresAt < NOW()');
$stmt->execute();
$count = $stmt->rowCount();

if ($count > 0) {
    echo "Cleaned up {$count} expired sessions\n";
}

// Remove invite tokens whose grace period has lapsed.
$stmt = $db->prepare('DELETE FROM InviteToken WHERE validUntil IS NOT NULL AND validUntil < NOW()');
$stmt->execute();
$tokenCount = $stmt->rowCount();

if ($tokenCount > 0) {
    echo "Cleaned up {$tokenCount} expired invite tokens\n";
}
