<?php

declare(strict_types=1);

namespace Kryssanu\Routes;

use Kryssanu\Database;
use Kryssanu\Helpers;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class AuthRoutes
{
    private const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

    public static function register(App $app): void
    {
        $app->group('/api/auth', function (RouteCollectorProxy $group) {
            $group->post('/google', [self::class, 'google']);
            $group->post('/logout', [self::class, 'logout']);

            // Mint a session without Google OAuth so the app can be driven by
            // browser automation. Only registered outside production.
            if (!self::isProduction()) {
                $group->post('/dev-login', [self::class, 'devLogin']);
                $group->get('/dev-login', [self::class, 'devLogin']);
            }
        });
    }

    private static function isProduction(): bool
    {
        return ($_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: 'development') === 'production';
    }

    /**
     * Create a session row for a user and attach the session cookie to the response.
     */
    private static function startSession(Response $response, string $userId): Response
    {
        $db = Database::getConnection();
        $sessionId = Helpers::generateCuid();
        $expiresAt = gmdate('Y-m-d H:i:s', time() + self::SESSION_MAX_AGE_SECONDS);
        $stmt = $db->prepare(
            'INSERT INTO Session (id, userId, expiresAt) VALUES (:id, :userId, :expiresAt)'
        );
        $stmt->execute([
            'id' => $sessionId,
            'userId' => $userId,
            'expiresAt' => $expiresAt,
        ]);

        $cookieParts = [
            "session={$sessionId}",
            'HttpOnly',
            'Path=/',
            'Max-Age=' . self::SESSION_MAX_AGE_SECONDS,
            'SameSite=Lax',
        ];
        if (self::isProduction()) {
            $cookieParts[] = 'Secure';
        }

        return $response->withHeader('Set-Cookie', implode('; ', $cookieParts));
    }

    /**
     * Dev-only login. Picks a user by ?email= (or the first user in the DB) and
     * mints a session, so automated browsers can reach authenticated pages.
     */
    public static function devLogin(Request $request, Response $response): Response
    {
        $db = Database::getConnection();
        $params = array_merge((array) ($request->getParsedBody() ?? []), $request->getQueryParams());
        $email = $params['email'] ?? null;

        if ($email) {
            $stmt = $db->prepare('SELECT * FROM User WHERE email = :email LIMIT 1');
            $stmt->execute(['email' => $email]);
        } else {
            $stmt = $db->query('SELECT * FROM User ORDER BY id ASC LIMIT 1');
        }
        $user = $stmt->fetch();

        if (!$user) {
            return Helpers::jsonResponse($response, [
                'error' => $email ? "No user with email {$email}" : 'No users in database',
            ], 404);
        }

        $response = self::startSession($response, $user['id']);
        return Helpers::jsonResponse($response, Helpers::formatUser($user));
    }

    public static function google(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody();
        $credential = $body['credential'] ?? null;

        if (!$credential) {
            return Helpers::jsonResponse($response, ['error' => 'Missing credential'], 400);
        }

        try {
            $clientId = $_ENV['GOOGLE_CLIENT_ID'] ?? getenv('GOOGLE_CLIENT_ID');
            $client = new \Google\Client(['client_id' => $clientId]);
            $payload = $client->verifyIdToken($credential);

            if (!$payload || !isset($payload['sub'])) {
                return Helpers::jsonResponse($response, ['error' => 'Invalid Google token'], 400);
            }

            $db = Database::getConnection();

            // Find user by googleId
            $stmt = $db->prepare('SELECT * FROM User WHERE googleId = :googleId');
            $stmt->execute(['googleId' => $payload['sub']]);
            $user = $stmt->fetch();

            if (!$user) {
                // Create user
                $userId = Helpers::generateCuid();
                $stmt = $db->prepare(
                    'INSERT INTO User (id, googleId, email, name, image) VALUES (:id, :googleId, :email, :name, :image)'
                );
                $stmt->execute([
                    'id' => $userId,
                    'googleId' => $payload['sub'],
                    'email' => $payload['email'] ?? null,
                    'name' => $payload['name'] ?? null,
                    'image' => $payload['picture'] ?? null,
                ]);

                $stmt = $db->prepare('SELECT * FROM User WHERE id = :id');
                $stmt->execute(['id' => $userId]);
                $user = $stmt->fetch();
            }

            $response = self::startSession($response, $user['id']);

            return Helpers::jsonResponse($response, Helpers::formatUser($user));
        } catch (\Exception $e) {
            error_log("Google auth error: " . $e->getMessage());
            return Helpers::jsonResponse($response, ['error' => 'Authentication failed'], 500);
        }
    }

    public static function logout(Request $request, Response $response): Response
    {
        $cookies = $request->getCookieParams();
        $sessionId = $cookies['session'] ?? null;

        if ($sessionId) {
            $db = Database::getConnection();
            try {
                $stmt = $db->prepare('DELETE FROM Session WHERE id = :id');
                $stmt->execute(['id' => $sessionId]);
            } catch (\Exception $e) {
                // Ignore errors when deleting session
            }
        }

        // Clear cookie
        $response = $response->withHeader(
            'Set-Cookie',
            'session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'
        );

        return Helpers::jsonResponse($response, ['ok' => true]);
    }

}
