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

class ObservationRoutes
{
    public static function register(App $app): void
    {
        $app->group('/api/observations', function (RouteCollectorProxy $group) {
            $group->get('/checklist', [self::class, 'checklist']);
            $group->get('/observed', [self::class, 'observed']);
            $group->get('/latest', [self::class, 'latest']);
            $group->get('/bird/{birdId}', [self::class, 'byBird']);
            $group->post('', [self::class, 'create']);
        })->add(new AuthMiddleware());
    }

    public static function checklist(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        // Fetch all non-visitor birds
        $birds = $db->query('SELECT * FROM Bird WHERE visitor = 0 ORDER BY swedish ASC')->fetchAll();
        $birds = array_map([Helpers::class, 'formatBird'], $birds);

        // Fetch user's observations
        $stmt = $db->prepare(
            'SELECT birdId, date FROM Observation WHERE userId = :userId ORDER BY date ASC'
        );
        $stmt->execute(['userId' => $user['id']]);
        $observations = $stmt->fetchAll();

        $observed = [];
        foreach ($observations as $o) {
            $birdId = $o['birdId'];
            if (!isset($observed[$birdId])) {
                $observed[$birdId] = [];
            }
            $observed[$birdId][] = Helpers::toISOString($o['date']);
        }

        return Helpers::jsonResponse($response, [
            'birds' => $birds,
            'observed' => (object) $observed,
        ]);
    }

    public static function observed(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $stmt = $db->prepare(
            'SELECT DISTINCT birdId FROM Observation WHERE userId = :userId'
        );
        $stmt->execute(['userId' => $user['id']]);
        $rows = $stmt->fetchAll();

        $result = new \stdClass();
        foreach ($rows as $row) {
            $result->{$row['birdId']} = true;
        }

        return Helpers::jsonResponse($response, $result);
    }

    public static function latest(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $stmt = $db->prepare(
            'SELECT o.*, b.id as b_id, b.swedish as b_swedish, b.family as b_family, b.visitor as b_visitor
             FROM Observation o
             JOIN Bird b ON b.id = o.birdId
             WHERE o.userId = :userId
             ORDER BY o.date DESC
             LIMIT 10'
        );
        $stmt->execute(['userId' => $user['id']]);
        $rows = $stmt->fetchAll();

        $observations = array_map(function ($row) {
            $obs = Helpers::formatObservation($row);
            $obs['bird'] = Helpers::formatBird([
                'id' => $row['b_id'],
                'swedish' => $row['b_swedish'],
                'family' => $row['b_family'],
                'visitor' => $row['b_visitor'],
            ]);
            return $obs;
        }, $rows);

        return Helpers::jsonResponse($response, $observations);
    }

    public static function byBird(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $stmt = $db->prepare(
            'SELECT * FROM Observation WHERE userId = :userId AND birdId = :birdId ORDER BY date DESC'
        );
        $stmt->execute(['userId' => $user['id'], 'birdId' => $args['birdId']]);
        $rows = $stmt->fetchAll();

        $observations = array_map([Helpers::class, 'formatObservation'], $rows);

        return Helpers::jsonResponse($response, $observations);
    }

    public static function create(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $body = $request->getParsedBody() ?? [];

        // Validate
        if (empty($body['birdId']) || !is_string($body['birdId'])) {
            return Helpers::jsonResponse($response, [
                'error' => [
                    'fieldErrors' => ['birdId' => ['Required']],
                    'formErrors' => [],
                ],
            ], 400);
        }

        $db = Database::getConnection();
        $now = Helpers::nowDatetime();
        $obsId = Helpers::generateCuid();

        $stmt = $db->prepare(
            'INSERT INTO Observation (id, birdId, userId, note, location, date, createdAt, updatedAt)
             VALUES (:id, :birdId, :userId, :note, :location, :date, :createdAt, :updatedAt)'
        );
        $stmt->execute([
            'id' => $obsId,
            'birdId' => $body['birdId'],
            'userId' => $user['id'],
            'note' => $body['note'] ?? null,
            'location' => $body['location'] ?? null,
            'date' => $now,
            'createdAt' => $now,
            'updatedAt' => $now,
        ]);

        // Auto-link to active events where user is accepted participant
        $stmt = $db->prepare(
            'SELECT e.id FROM Event e
             JOIN Participant p ON p.eventId = e.id
             WHERE p.userId = :userId AND p.status = :status
               AND e.startsAt <= :now AND e.endsAt >= :now2'
        );
        $stmt->execute([
            'userId' => $user['id'],
            'status' => 'ACCEPTED',
            'now' => $now,
            'now2' => $now,
        ]);
        $matchingEvents = $stmt->fetchAll();

        if (!empty($matchingEvents)) {
            $insertStmt = $db->prepare(
                'INSERT INTO ObservationEvent (observationId, eventId) VALUES (:obsId, :eventId)'
            );
            foreach ($matchingEvents as $event) {
                $insertStmt->execute(['obsId' => $obsId, 'eventId' => $event['id']]);
            }
        }

        // Fetch the created observation
        $stmt = $db->prepare('SELECT * FROM Observation WHERE id = :id');
        $stmt->execute(['id' => $obsId]);
        $observation = $stmt->fetch();

        return Helpers::jsonResponse($response, Helpers::formatObservation($observation), 201);
    }
}
