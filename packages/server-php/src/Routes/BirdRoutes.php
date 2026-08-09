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
            $group->get('/version', [self::class, 'version']);
            $group->get('/{id}', [self::class, 'get']);
        });
    }

    public static function version(Request $request, Response $response): Response
    {
        $db = Database::getConnection();
        $where = self::scopeWhere($request);
        $count = (int) $db->query("SELECT COUNT(*) FROM Bird {$where}")->fetchColumn();
        $response = $response->withHeader('Cache-Control', 'public, max-age=300');
        return Helpers::jsonResponse($response, ['version' => $count]);
    }

    public static function list(Request $request, Response $response): Response
    {
        $db = Database::getConnection();
        $where = self::scopeWhere($request);

        $params = $request->getQueryParams();
        $sql = "SELECT * FROM Bird {$where} ORDER BY swedish ASC";
        if (isset($params['limit'])) {
            $limit = max(0, (int) $params['limit']);
            $offset = max(0, (int) ($params['offset'] ?? 0));
            $sql .= " LIMIT {$limit} OFFSET {$offset}";
        }

        $stmt = $db->query($sql);
        $birds = array_map([Helpers::class, 'formatBird'], $stmt->fetchAll());
        $response = $response->withHeader('Cache-Control', 'public, max-age=86400');
        return Helpers::jsonResponse($response, $birds);
    }

    /**
     * `scope=world` returns every species; anything else (including no param)
     * stays scoped to Sweden's official list, matching pre-existing behavior.
     */
    private static function scopeWhere(Request $request): string
    {
        $scope = $request->getQueryParams()['scope'] ?? 'sweden';
        return $scope === 'world' ? '' : 'WHERE onSwedishList = 1';
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
