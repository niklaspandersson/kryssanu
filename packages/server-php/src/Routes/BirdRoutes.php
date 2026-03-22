<?php

declare(strict_types=1);

namespace Kryssanu\Routes;

use Kryssanu\Database;
use Kryssanu\Helpers;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class BirdRoutes
{
    public static function register(App $app): void
    {
        $app->group('/api/birds', function (RouteCollectorProxy $group) {
            $group->get('', [self::class, 'list']);
            $group->get('/{id}', [self::class, 'get']);
        });
    }

    public static function list(Request $request, Response $response): Response
    {
        $db = Database::getConnection();
        $stmt = $db->query('SELECT * FROM Bird WHERE visitor = 0 ORDER BY swedish ASC');
        $birds = array_map([Helpers::class, 'formatBird'], $stmt->fetchAll());
        $response = $response->withHeader('Cache-Control', 'public, max-age=86400');
        return Helpers::jsonResponse($response, $birds);
    }

    public static function get(Request $request, Response $response, array $args): Response
    {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM Bird WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $bird = $stmt->fetch();

        if (!$bird) {
            return Helpers::jsonResponse($response, ['error' => 'Bird not found'], 404);
        }

        $response = $response->withHeader('Cache-Control', 'public, max-age=86400');
        return Helpers::jsonResponse($response, Helpers::formatBird($bird));
    }
}
