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

class FeedRoutes
{
    public static function register(App $app): void
    {
        $app->group('/api/feed', function (RouteCollectorProxy $group) {
            $group->get('', [self::class, 'getFeed']);
        })->add(new AuthMiddleware());
    }

    public static function getFeed(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();
        $cursor = $request->getQueryParams()['cursor'] ?? null;
        $limit = 20;

        // Find event IDs user participates in
        $stmt = $db->prepare(
            'SELECT eventId FROM Participant WHERE userId = :userId AND status = :status'
        );
        $stmt->execute(['userId' => $user['id'], 'status' => 'ACCEPTED']);
        $eventIds = array_column($stmt->fetchAll(), 'eventId');

        if (empty($eventIds)) {
            return Helpers::jsonResponse($response, ['items' => [], 'nextCursor' => null]);
        }

        // Find co-participant user IDs (excluding self)
        $placeholders = implode(',', array_fill(0, count($eventIds), '?'));
        $stmt = $db->prepare(
            "SELECT DISTINCT userId FROM Participant
             WHERE eventId IN ({$placeholders}) AND status = 'ACCEPTED' AND userId != ?"
        );
        $params = [...$eventIds, $user['id']];
        $stmt->execute($params);
        $peerIds = array_column($stmt->fetchAll(), 'userId');

        if (empty($peerIds)) {
            return Helpers::jsonResponse($response, ['items' => [], 'nextCursor' => null]);
        }

        // Fetch observations from peers
        $peerPlaceholders = implode(',', array_fill(0, count($peerIds), '?'));
        $cursorCondition = $cursor ? 'AND o.id < ?' : '';

        $sql = "SELECT o.id, o.date,
                       u.id as u_id, u.name as u_name, u.email as u_email, u.image as u_image,
                       b.id as b_id, b.swedish as b_swedish, b.family as b_family, b.visitor as b_visitor
                FROM Observation o
                JOIN User u ON u.id = o.userId
                JOIN Bird b ON b.id = o.birdId
                WHERE o.userId IN ({$peerPlaceholders})
                {$cursorCondition}
                ORDER BY o.date DESC
                LIMIT ?";

        $queryParams = [...$peerIds];
        if ($cursor) {
            $queryParams[] = $cursor;
        }
        $queryParams[] = $limit + 1;

        $stmt = $db->prepare($sql);
        $stmt->execute($queryParams);
        $rows = $stmt->fetchAll();

        $hasMore = count($rows) > $limit;
        $items = array_slice($rows, 0, $limit);

        $formatted = array_map(function ($row) {
            return [
                'id' => $row['id'],
                'date' => Helpers::toISOString($row['date']),
                'user' => [
                    'id' => $row['u_id'],
                    'name' => $row['u_name'],
                    'email' => $row['u_email'],
                    'image' => $row['u_image'],
                ],
                'bird' => [
                    'id' => $row['b_id'],
                    'swedish' => $row['b_swedish'],
                    'family' => $row['b_family'],
                    'visitor' => (bool) $row['b_visitor'],
                ],
            ];
        }, $items);

        $nextCursor = $hasMore ? end($formatted)['id'] : null;

        return Helpers::jsonResponse($response, [
            'items' => $formatted,
            'nextCursor' => $nextCursor,
        ]);
    }
}
