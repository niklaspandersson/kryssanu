<?php

declare(strict_types=1);

namespace Kryssanu\Routes;

use Kryssanu\Database;
use Kryssanu\Helpers;
use Kryssanu\Middleware\AuthMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class UserRoutes
{
    public static function register(App $app): void
    {
        $app->group('/api/users', function (RouteCollectorProxy $group) {
            $group->get('/{id}', [self::class, 'getUser']);
            $group->patch('/me', [self::class, 'updateProfile']);
        })->add(new AuthMiddleware());
    }

    public static function getUser(Request $request, Response $response, array $args): Response
    {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            'SELECT id, name, email, image, city, about FROM User WHERE id = :id'
        );
        $stmt->execute(['id' => $args['id']]);
        $user = $stmt->fetch();

        if (!$user) {
            return Helpers::jsonResponse($response, ['error' => 'User not found'], 404);
        }

        return Helpers::jsonResponse($response, Helpers::formatUser($user));
    }

    public static function updateProfile(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody() ?? [];
        $user = $request->getAttribute('user');

        // Validate
        $errors = [];
        if (isset($body['city']) && strlen($body['city']) > 100) {
            $errors['city'] = ['String must contain at most 100 character(s)'];
        }
        if (isset($body['about']) && strlen($body['about']) > 500) {
            $errors['about'] = ['String must contain at most 500 character(s)'];
        }

        if (!empty($errors)) {
            return Helpers::jsonResponse($response, [
                'error' => ['fieldErrors' => $errors, 'formErrors' => []],
            ], 400);
        }

        $db = Database::getConnection();
        $sets = [];
        $params = ['id' => $user['id']];

        if (array_key_exists('city', $body)) {
            $sets[] = 'city = :city';
            $params['city'] = $body['city'];
        }
        if (array_key_exists('about', $body)) {
            $sets[] = 'about = :about';
            $params['about'] = $body['about'];
        }

        if (!empty($sets)) {
            $sql = 'UPDATE User SET ' . implode(', ', $sets) . ' WHERE id = :id';
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
        }

        $stmt = $db->prepare(
            'SELECT id, name, email, image, city, about FROM User WHERE id = :id'
        );
        $stmt->execute(['id' => $user['id']]);
        $updated = $stmt->fetch();

        return Helpers::jsonResponse($response, Helpers::formatUser($updated));
    }
}
