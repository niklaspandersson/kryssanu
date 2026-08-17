<?php

declare(strict_types=1);

namespace Kryssanu\Middleware;

use Kryssanu\Database;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

class SessionMiddleware implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $cookies = $request->getCookieParams();
        $sessionId = $cookies['session'] ?? null;

        $needsRefresh = false;

        if ($sessionId) {
            $db = Database::getConnection();
            $stmt = $db->prepare(
                'SELECT s.id as sessionId, s.expiresAt,
                        u.id, u.name, u.email, u.image, u.city, u.about, u.settings
                 FROM Session s
                 JOIN User u ON u.id = s.userId
                 WHERE s.id = :sessionId AND s.expiresAt > NOW()'
            );
            $stmt->execute(['sessionId' => $sessionId]);
            $row = $stmt->fetch();

            if ($row) {
                $refreshThreshold = gmdate('Y-m-d H:i:s', time() + 28 * 24 * 60 * 60);
                $needsRefresh = $row['expiresAt'] < $refreshThreshold;

                if ($needsRefresh) {
                    $newExpiry = gmdate('Y-m-d H:i:s', time() + 30 * 24 * 60 * 60);
                    $upd = $db->prepare('UPDATE Session SET expiresAt = :e WHERE id = :id');
                    $upd->execute(['e' => $newExpiry, 'id' => $row['sessionId']]);
                }

                $request = $request->withAttribute('user', [
                    'id' => $row['id'],
                    'name' => $row['name'],
                    'email' => $row['email'],
                    'image' => $row['image'],
                    'city' => $row['city'],
                    'about' => $row['about'],
                    'settings' => $row['settings'],
                ]);
            }
        }

        $response = $handler->handle($request);

        if ($needsRefresh) {
            $maxAge = 30 * 24 * 60 * 60;
            $isProduction = ($_ENV['APP_ENV'] ?? getenv('APP_ENV') ?? 'development') === 'production';
            $secure = $isProduction ? '; Secure' : '';
            $response = $response->withAddedHeader(
                'Set-Cookie',
                "session={$sessionId}; Path=/; SameSite=Lax; HttpOnly; Max-Age={$maxAge}{$secure}"
            );
        }

        return $response;
    }
}
