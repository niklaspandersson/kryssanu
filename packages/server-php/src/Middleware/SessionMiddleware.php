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

        if ($sessionId) {
            $db = Database::getConnection();
            $stmt = $db->prepare(
                'SELECT s.id as sessionId, s.expiresAt,
                        u.id, u.name, u.email, u.image, u.city, u.about
                 FROM Session s
                 JOIN User u ON u.id = s.userId
                 WHERE s.id = :sessionId AND s.expiresAt > NOW()'
            );
            $stmt->execute(['sessionId' => $sessionId]);
            $row = $stmt->fetch();

            if ($row) {
                $request = $request->withAttribute('user', [
                    'id' => $row['id'],
                    'name' => $row['name'],
                    'email' => $row['email'],
                    'image' => $row['image'],
                    'city' => $row['city'],
                    'about' => $row['about'],
                ]);
            }
        }

        return $handler->handle($request);
    }
}
