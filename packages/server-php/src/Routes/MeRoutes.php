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

class MeRoutes
{
    public static function register(App $app): void
    {
        $app->group('/api/me', function (RouteCollectorProxy $group) {
            $group->get('', [self::class, 'getProfile']);
            $group->patch('', [self::class, 'updateProfile']);
            $group->get('/stats', [self::class, 'stats']);
            $group->get('/checklist', [self::class, 'checklist']);
            $group->get('/observed', [self::class, 'observed']);
            $group->get('/observations', [self::class, 'observations']);
            $group->get('/observations/bird/{birdId}', [self::class, 'observationsByBird']);
            $group->post('/observations', [self::class, 'createObservation']);
            $group->get('/memberships', [self::class, 'memberships']);
            $group->get('/feed', [self::class, 'feed']);
        })->add(new AuthMiddleware());
    }

    public static function getProfile(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $response = $response->withHeader('Cache-Control', 'private, no-store');
        return Helpers::jsonResponse($response, Helpers::formatUser($user));
    }

    public static function updateProfile(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody() ?? [];
        $user = $request->getAttribute('user');

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

    public static function stats(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $stats = StatsRoutes::getUserStats($user['id']);
        $response = $response->withHeader('Cache-Control', 'private, max-age=300');
        return Helpers::jsonResponse($response, $stats);
    }

    public static function checklist(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

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

    public static function observations(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $limit = min((int) ($request->getQueryParams()['limit'] ?? 10), 50);
        $offset = max((int) ($request->getQueryParams()['offset'] ?? 0), 0);

        $stmt = $db->prepare(
            'SELECT o.*, b.id as b_id, b.swedish as b_swedish, b.family as b_family, b.visitor as b_visitor
             FROM Observation o
             JOIN Bird b ON b.id = o.birdId
             WHERE o.userId = :userId
             ORDER BY o.date DESC
             LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue('userId', $user['id']);
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();
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

    public static function observationsByBird(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $limit = min((int) ($request->getQueryParams()['limit'] ?? 50), 100);
        $offset = max((int) ($request->getQueryParams()['offset'] ?? 0), 0);

        $stmt = $db->prepare(
            'SELECT * FROM Observation WHERE userId = :userId AND birdId = :birdId ORDER BY date DESC LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue('userId', $user['id']);
        $stmt->bindValue('birdId', $args['birdId']);
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        $observations = array_map([Helpers::class, 'formatObservation'], $rows);

        return Helpers::jsonResponse($response, $observations);
    }

    public static function createObservation(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $body = $request->getParsedBody() ?? [];

        // Validate
        $errors = [];
        if (empty($body['birdId']) || !is_string($body['birdId'])) {
            $errors['birdId'] = ['Required'];
        }

        if (!empty($body['date'])) {
            $parsed = strtotime($body['date']);
            if ($parsed === false || $parsed > time()) {
                $errors['date'] = ['Invalid or future date'];
            }
        }

        if (!empty($errors)) {
            return Helpers::jsonResponse($response, [
                'error' => [
                    'fieldErrors' => $errors,
                    'formErrors' => [],
                ],
            ], 400);
        }

        $db = Database::getConnection();

        // Validate birdId exists
        $stmt = $db->prepare('SELECT 1 FROM Bird WHERE id = :id');
        $stmt->execute(['id' => $body['birdId']]);
        if (!$stmt->fetch()) {
            return Helpers::jsonResponse($response, [
                'error' => [
                    'fieldErrors' => ['birdId' => ['Bird not found']],
                    'formErrors' => [],
                ],
            ], 400);
        }

        $now = Helpers::nowDatetime();
        $obsId = Helpers::generateCuid();

        $date = !empty($body['date']) ? gmdate('Y-m-d H:i:s', strtotime($body['date'])) : $now;

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
            'date' => $date,
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

    public static function memberships(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT eventId, status FROM Participant WHERE userId = :userId');
        $stmt->execute(['userId' => $user['id']]);
        $rows = $stmt->fetchAll();

        $result = new \stdClass();
        foreach ($rows as $row) {
            $result->{$row['eventId']} = $row['status'];
        }

        $response = $response->withHeader('Cache-Control', 'private, no-store');
        return Helpers::jsonResponse($response, $result);
    }

    public static function feed(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();
        $cursor = $request->getQueryParams()['cursor'] ?? null;
        $limit = min((int) ($request->getQueryParams()['limit'] ?? 20), 20);

        $eventId = $request->getQueryParams()['eventId'] ?? null;

        if ($eventId) {
            $eventIds = [$eventId];
        } else {
            $stmt = $db->prepare(
                'SELECT p.eventId FROM Participant p
                 JOIN Event e ON e.id = p.eventId
                 WHERE p.userId = :userId AND p.status = :status
                 AND e.startsAt <= NOW() AND e.endsAt >= NOW()'
            );
            $stmt->execute(['userId' => $user['id'], 'status' => 'ACCEPTED']);
            $eventIds = array_column($stmt->fetchAll(), 'eventId');
        }

        if (empty($eventIds)) {
            return Helpers::jsonResponse($response, ['items' => [], 'nextCursor' => null]);
        }

        $placeholders = implode(',', array_fill(0, count($eventIds), '?'));
        $cursorCondition = $cursor ? 'AND o.id < ?' : '';

        $sql = "SELECT DISTINCT o.id, o.date,
                       u.id as u_id, u.name as u_name, u.email as u_email, u.image as u_image,
                       b.id as b_id, b.swedish as b_swedish, b.family as b_family, b.visitor as b_visitor
                FROM Observation o
                JOIN User u ON u.id = o.userId
                JOIN Bird b ON b.id = o.birdId
                JOIN ObservationEvent oe ON oe.observationId = o.id
                WHERE oe.eventId IN ({$placeholders})
                {$cursorCondition}
                ORDER BY o.date DESC
                LIMIT ?";

        $queryParams = [...$eventIds];
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
