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
    /** Cap on the serialized settings blob. */
    private const MAX_SETTINGS_BYTES = 4096;

    public static function register(App $app): void
    {
        $app->group('/api/me', function (RouteCollectorProxy $group) {
            $group->get('', [self::class, 'getProfile']);
            $group->patch('', [self::class, 'updateProfile']);
            $group->get('/stats', [self::class, 'stats']);
            $group->get('/checklist', [self::class, 'checklist']);
            $group->get('/observed', [self::class, 'observed']);
            $group->get('/observations', [self::class, 'observations']);
            $group->get('/observations/all', [self::class, 'allObservations']);
            $group->get('/observations/bird/{birdId}', [self::class, 'observationsByBird']);
            $group->post('/observations', [self::class, 'createObservation']);
            $group->post('/observations/bulk', [self::class, 'bulkObservations']);
            $group->patch('/observations/{id}', [self::class, 'updateObservation']);
            $group->delete('/observations/{id}', [self::class, 'deleteObservation']);
            $group->get('/memberships', [self::class, 'memberships']);
            $group->get('/feed', [self::class, 'feed']);
            $group->get('/lists', [self::class, 'lists']);
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

        // Settings are schemaless by design — the client owns their shape — so
        // the only checks here are that it is a JSON object and stays small
        // enough that a user-writable column cannot become general storage.
        $mergedSettings = null;
        if (array_key_exists('settings', $body)) {
            if (!is_array($body['settings']) || array_is_list($body['settings'])) {
                $errors['settings'] = ['Expected an object'];
            } else {
                $existing = (array) Helpers::decodeSettings($user['settings'] ?? null);
                // Merged, not replaced: a partial save from one screen must not
                // drop a key written by another.
                $mergedSettings = json_encode(array_merge($existing, $body['settings']));
                if (strlen($mergedSettings) > self::MAX_SETTINGS_BYTES) {
                    $errors['settings'] = [
                        'Must serialize to at most ' . self::MAX_SETTINGS_BYTES . ' bytes',
                    ];
                }
            }
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
        if ($mergedSettings !== null) {
            $sets[] = 'settings = :settings';
            $params['settings'] = $mergedSettings;
        }

        if (!empty($sets)) {
            $sql = 'UPDATE User SET ' . implode(', ', $sets) . ' WHERE id = :id';
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
        }

        $stmt = $db->prepare(
            'SELECT id, name, email, image, city, about, settings FROM User WHERE id = :id'
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

        // One row per species rather than per observation. The page only ever
        // reads the first and last date in each bucket (overall, and within the
        // current year), so returning every date made the payload grow with the
        // user's observation count for no gain — and it is cached to IndexedDB
        // client-side on top of that. Aggregating here bounds the response by
        // the size of the Bird table instead.
        //
        // The year boundary is UTC, matching StatsRoutes::getUserStats.
        $startOfYear = gmdate('Y') . '-01-01 00:00:00';

        $stmt = $db->prepare(
            'SELECT birdId,
                    MIN(date) AS firstDate,
                    MAX(date) AS lastDate,
                    MIN(CASE WHEN date >= :startOfYear THEN date END) AS firstThisYear,
                    MAX(CASE WHEN date >= :startOfYear2 THEN date END) AS lastThisYear
             FROM Observation
             WHERE userId = :userId
             GROUP BY birdId'
        );
        $stmt->execute([
            'userId' => $user['id'],
            'startOfYear' => $startOfYear,
            'startOfYear2' => $startOfYear,
        ]);

        $observed = [];
        while ($row = $stmt->fetch()) {
            $observed[$row['birdId']] = [
                'firstDate' => Helpers::toISOString($row['firstDate']),
                'lastDate' => Helpers::toISOString($row['lastDate']),
                'firstThisYear' => $row['firstThisYear'] !== null
                    ? Helpers::toISOString($row['firstThisYear'])
                    : null,
                'lastThisYear' => $row['lastThisYear'] !== null
                    ? Helpers::toISOString($row['lastThisYear'])
                    : null,
            ];
        }

        $response = $response->withHeader('Cache-Control', 'private, max-age=60');
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

        ['limit' => $limit, 'offset' => $offset] = Helpers::paginationParams($request, 10, 50);

        $stmt = $db->prepare(
            'SELECT o.*, b.id as b_id, b.swedish as b_swedish, b.family as b_family, b.parentId as b_parentId, b.kategori as b_kategori, b.status as b_status, b.delisted as b_delisted,
                    (SELECT oi.id FROM ObservationImage oi WHERE oi.observationId = o.id ORDER BY oi.createdAt ASC LIMIT 1) AS img_id
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
                'parentId' => $row['b_parentId'],
                'kategori' => $row['b_kategori'],
                'status' => $row['b_status'],
                'delisted' => $row['b_delisted'],
            ]);
            return $obs;
        }, $rows);

        return Helpers::jsonResponse($response, $observations);
    }

    public static function allObservations(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        ['limit' => $limit, 'offset' => $offset] = Helpers::paginationParams($request, 100, 100);

        $listId = $request->getQueryParams()['listId'] ?? null;
        $birdId = $request->getQueryParams()['birdId'] ?? null;

        // Optional filters: by list membership and/or by species. Both narrow the
        // same paginated result set so the client keeps full pagination/bulk support.
        $joins = '';
        $where = 'o.userId = :userId';
        $bindings = ['userId' => $user['id']];
        if ($listId !== null) {
            $joins .= ' JOIN ObservationList ol ON ol.observationId = o.id AND ol.listId = :listId';
            $bindings['listId'] = $listId;
        }
        if ($birdId !== null) {
            $where .= ' AND o.birdId = :birdId';
            $bindings['birdId'] = $birdId;
        }

        $countStmt = $db->prepare(
            "SELECT COUNT(*) FROM Observation o{$joins} WHERE {$where}"
        );
        $countStmt->execute($bindings);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $db->prepare(
            "SELECT o.*, b.id as b_id, b.swedish as b_swedish, b.family as b_family, b.parentId as b_parentId, b.kategori as b_kategori, b.status as b_status, b.delisted as b_delisted,
                    (SELECT oi.id FROM ObservationImage oi WHERE oi.observationId = o.id ORDER BY oi.createdAt ASC LIMIT 1) AS img_id
             FROM Observation o
             JOIN Bird b ON b.id = o.birdId{$joins}
             WHERE {$where}
             ORDER BY o.date DESC, o.id DESC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($bindings as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        $listIdsByObs = self::listIdsForObservations($db, array_column($rows, 'id'));

        $observations = array_map(function ($row) use ($listIdsByObs) {
            $obs = Helpers::formatObservation($row);
            $obs['bird'] = Helpers::formatBird([
                'id' => $row['b_id'],
                'swedish' => $row['b_swedish'],
                'family' => $row['b_family'],
                'parentId' => $row['b_parentId'],
                'kategori' => $row['b_kategori'],
                'status' => $row['b_status'],
                'delisted' => $row['b_delisted'],
            ]);
            $obs['listIds'] = $listIdsByObs[$row['id']] ?? [];
            return $obs;
        }, $rows);

        return Helpers::jsonResponse($response, [
            'observations' => $observations,
            'total' => $total,
        ]);
    }

    /**
     * Fetch list memberships for a set of observation ids, grouped by observation.
     *
     * @param string[] $observationIds
     * @return array<string, string[]>
     */
    private static function listIdsForObservations(\PDO $db, array $observationIds): array
    {
        if (empty($observationIds)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($observationIds), '?'));
        $stmt = $db->prepare(
            "SELECT observationId, listId FROM ObservationList WHERE observationId IN ({$placeholders})"
        );
        $stmt->execute($observationIds);

        $map = [];
        foreach ($stmt->fetchAll() as $row) {
            $map[$row['observationId']][] = $row['listId'];
        }
        return $map;
    }

    public static function observationsByBird(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        ['limit' => $limit, 'offset' => $offset] = Helpers::paginationParams($request, 50, 100);

        // Returned alongside the rows so the page can say how many observations
        // exist rather than how many this response happened to carry.
        $countStmt = $db->prepare(
            'SELECT COUNT(*)
             FROM Observation o
             JOIN Bird b ON b.id = o.birdId
             WHERE o.userId = :userId AND (o.birdId = :birdId OR b.parentId = :parentId)'
        );
        $countStmt->execute([
            'userId' => $user['id'],
            'birdId' => $args['birdId'],
            'parentId' => $args['birdId'],
        ]);
        $total = (int) $countStmt->fetchColumn();

        // A species' page also lists observations of its subspecies: someone who
        // logged mörkbukig prutgås has seen a prutgås. The reverse does not hold,
        // so a subspecies page only ever shows its own.
        $stmt = $db->prepare(
            'SELECT o.*,
                    (SELECT oi.id FROM ObservationImage oi WHERE oi.observationId = o.id ORDER BY oi.createdAt ASC LIMIT 1) AS img_id
             FROM Observation o
             JOIN Bird b ON b.id = o.birdId
             WHERE o.userId = :userId AND (o.birdId = :birdId OR b.parentId = :parentId)
             ORDER BY o.date DESC LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue('userId', $user['id']);
        // Two placeholders for one value: PDO with native prepares cannot reuse
        // a named parameter.
        $stmt->bindValue('birdId', $args['birdId']);
        $stmt->bindValue('parentId', $args['birdId']);
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        $listIdsByObs = self::listIdsForObservations($db, array_column($rows, 'id'));

        $observations = array_map(function ($row) use ($listIdsByObs) {
            $obs = Helpers::formatObservation($row);
            $obs['listIds'] = $listIdsByObs[$row['id']] ?? [];
            return $obs;
        }, $rows);

        return Helpers::jsonResponse($response, [
            'observations' => $observations,
            'total' => $total,
        ]);
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

        if (isset($body['latitude'])) {
            $lat = filter_var($body['latitude'], FILTER_VALIDATE_FLOAT);
            if ($lat === false || $lat < -90 || $lat > 90) {
                $errors['latitude'] = ['Must be between -90 and 90'];
            }
        }
        if (isset($body['longitude'])) {
            $lng = filter_var($body['longitude'], FILTER_VALIDATE_FLOAT);
            if ($lng === false || $lng < -180 || $lng > 180) {
                $errors['longitude'] = ['Must be between -180 and 180'];
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
            'INSERT INTO Observation (id, birdId, userId, note, location, latitude, longitude, date, createdAt, updatedAt)
             VALUES (:id, :birdId, :userId, :note, :location, :latitude, :longitude, :date, :createdAt, :updatedAt)'
        );
        $stmt->execute([
            'id' => $obsId,
            'birdId' => $body['birdId'],
            'userId' => $user['id'],
            'note' => $body['note'] ?? null,
            'location' => $body['location'] ?? null,
            'latitude' => isset($body['latitude']) ? (float) $body['latitude'] : null,
            'longitude' => isset($body['longitude']) ? (float) $body['longitude'] : null,
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

        // Link to user-selected lists
        if (!empty($body['listIds']) && is_array($body['listIds'])) {
            $checkStmt = $db->prepare('SELECT id FROM `List` WHERE id = :id AND userId = :userId');
            $insertStmt = $db->prepare(
                'INSERT INTO ObservationList (observationId, listId, addedAt) VALUES (:obsId, :listId, :addedAt)'
            );
            foreach ($body['listIds'] as $listId) {
                if (!is_string($listId)) {
                    continue;
                }
                $checkStmt->execute(['id' => $listId, 'userId' => $user['id']]);
                if ($checkStmt->fetch()) {
                    $insertStmt->execute([
                        'obsId' => $obsId,
                        'listId' => $listId,
                        'addedAt' => $now,
                    ]);
                }
            }
        }

        // Fetch the created observation
        $stmt = $db->prepare('SELECT * FROM Observation WHERE id = :id');
        $stmt->execute(['id' => $obsId]);
        $observation = $stmt->fetch();

        return Helpers::jsonResponse($response, Helpers::formatObservation($observation), 201);
    }

    public static function updateObservation(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $body = $request->getParsedBody() ?? [];
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM Observation WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $obs = $stmt->fetch();

        if (!$obs || $obs['userId'] !== $user['id']) {
            return Helpers::jsonResponse($response, ['error' => 'Observation not found'], 404);
        }

        // Validate
        $errors = [];
        if (array_key_exists('date', $body) && !empty($body['date'])) {
            $parsed = strtotime($body['date']);
            if ($parsed === false || $parsed > time()) {
                $errors['date'] = ['Invalid or future date'];
            }
        }
        if (!empty($errors)) {
            return Helpers::jsonResponse($response, [
                'error' => ['fieldErrors' => $errors, 'formErrors' => []],
            ], 400);
        }

        $now = Helpers::nowDatetime();
        $sets = ['updatedAt = :updatedAt'];
        $params = ['id' => $args['id'], 'updatedAt' => $now];

        if (array_key_exists('date', $body) && !empty($body['date'])) {
            $sets[] = 'date = :date';
            $params['date'] = gmdate('Y-m-d H:i:s', strtotime($body['date']));
        }
        if (array_key_exists('location', $body)) {
            $sets[] = 'location = :location';
            $params['location'] = $body['location'] !== '' ? $body['location'] : null;
        }
        if (array_key_exists('note', $body)) {
            $sets[] = 'note = :note';
            $params['note'] = $body['note'] !== '' ? $body['note'] : null;
        }

        $stmt = $db->prepare('UPDATE Observation SET ' . implode(', ', $sets) . ' WHERE id = :id');
        $stmt->execute($params);

        // Replace list connections when listIds provided
        if (array_key_exists('listIds', $body) && is_array($body['listIds'])) {
            $del = $db->prepare('DELETE FROM ObservationList WHERE observationId = :obsId');
            $del->execute(['obsId' => $args['id']]);

            $checkStmt = $db->prepare('SELECT 1 FROM `List` WHERE id = :id AND userId = :userId');
            $insStmt = $db->prepare(
                'INSERT INTO ObservationList (observationId, listId, addedAt) VALUES (:obsId, :listId, :addedAt)'
            );
            foreach ($body['listIds'] as $listId) {
                if (!is_string($listId)) {
                    continue;
                }
                $checkStmt->execute(['id' => $listId, 'userId' => $user['id']]);
                if ($checkStmt->fetch()) {
                    $insStmt->execute(['obsId' => $args['id'], 'listId' => $listId, 'addedAt' => $now]);
                }
            }
        }

        $stmt = $db->prepare('SELECT * FROM Observation WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $updated = $stmt->fetch();

        $result = Helpers::formatObservation($updated);
        $result['listIds'] = self::listIdsForObservations($db, [$args['id']])[$args['id']] ?? [];

        return Helpers::jsonResponse($response, $result);
    }

    public static function deleteObservation(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT userId FROM Observation WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $obs = $stmt->fetch();

        if (!$obs || $obs['userId'] !== $user['id']) {
            return Helpers::jsonResponse($response, ['error' => 'Observation not found'], 404);
        }

        // Remove image files first; the DB row cascades with the observation.
        ImageRoutes::purgeObservationFiles($db, [$args['id']]);

        $stmt = $db->prepare('DELETE FROM Observation WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);

        return Helpers::jsonResponse($response, ['ok' => true]);
    }

    public static function bulkObservations(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $body = $request->getParsedBody() ?? [];
        $db = Database::getConnection();

        $ids = $body['ids'] ?? [];
        $op = $body['op'] ?? '';
        $value = $body['value'] ?? null;

        if (!is_array($ids) || empty($ids)) {
            return Helpers::jsonResponse($response, [
                'error' => ['fieldErrors' => ['ids' => ['Required']], 'formErrors' => []],
            ], 400);
        }
        $ids = array_values(array_filter($ids, 'is_string'));
        if (empty($ids)) {
            return Helpers::jsonResponse($response, [
                'error' => ['fieldErrors' => ['ids' => ['Required']], 'formErrors' => []],
            ], 400);
        }

        // Scope to observations actually owned by the user
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $ownStmt = $db->prepare(
            "SELECT id FROM Observation WHERE userId = ? AND id IN ({$placeholders})"
        );
        $ownStmt->execute([$user['id'], ...$ids]);
        $ownedIds = array_column($ownStmt->fetchAll(), 'id');

        if (empty($ownedIds)) {
            return Helpers::jsonResponse($response, ['ok' => true, 'count' => 0]);
        }

        $now = Helpers::nowDatetime();
        $ph = implode(',', array_fill(0, count($ownedIds), '?'));

        switch ($op) {
            case 'setLocation':
                $location = is_string($value) && $value !== '' ? $value : null;
                $stmt = $db->prepare(
                    "UPDATE Observation SET location = ?, updatedAt = ? WHERE id IN ({$ph})"
                );
                $stmt->execute([$location, $now, ...$ownedIds]);
                break;

            case 'setDate':
                $parsed = is_string($value) ? strtotime($value) : false;
                if ($parsed === false || $parsed > time()) {
                    return Helpers::jsonResponse($response, [
                        'error' => ['fieldErrors' => ['value' => ['Invalid or future date']], 'formErrors' => []],
                    ], 400);
                }
                $date = gmdate('Y-m-d H:i:s', $parsed);
                $stmt = $db->prepare(
                    "UPDATE Observation SET date = ?, updatedAt = ? WHERE id IN ({$ph})"
                );
                $stmt->execute([$date, $now, ...$ownedIds]);
                break;

            case 'addList':
            case 'removeList':
                if (!is_string($value) || $value === '') {
                    return Helpers::jsonResponse($response, [
                        'error' => ['fieldErrors' => ['value' => ['Required']], 'formErrors' => []],
                    ], 400);
                }
                $listStmt = $db->prepare('SELECT 1 FROM `List` WHERE id = :id AND userId = :userId');
                $listStmt->execute(['id' => $value, 'userId' => $user['id']]);
                if (!$listStmt->fetch()) {
                    return Helpers::jsonResponse($response, ['error' => 'List not found'], 404);
                }
                if ($op === 'addList') {
                    $ins = $db->prepare(
                        'INSERT IGNORE INTO ObservationList (observationId, listId, addedAt) VALUES (?, ?, ?)'
                    );
                    foreach ($ownedIds as $obsId) {
                        $ins->execute([$obsId, $value, $now]);
                    }
                } else {
                    $del = $db->prepare(
                        "DELETE FROM ObservationList WHERE listId = ? AND observationId IN ({$ph})"
                    );
                    $del->execute([$value, ...$ownedIds]);
                }
                break;

            case 'delete':
                // Remove image files first; the DB rows cascade with the observations.
                ImageRoutes::purgeObservationFiles($db, $ownedIds);
                $stmt = $db->prepare("DELETE FROM Observation WHERE id IN ({$ph})");
                $stmt->execute($ownedIds);
                break;

            default:
                return Helpers::jsonResponse($response, [
                    'error' => ['fieldErrors' => ['op' => ['Invalid operation']], 'formErrors' => []],
                ], 400);
        }

        return Helpers::jsonResponse($response, ['ok' => true, 'count' => count($ownedIds)]);
    }

    public static function memberships(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        // Grows with events joined. The client uses this as a lookup map for
        // events already on screen, so a ceiling well above any realistic
        // membership count costs nothing.
        $stmt = $db->prepare(
            'SELECT eventId, status FROM Participant WHERE userId = :userId
             ORDER BY joinedAt DESC
             LIMIT 500'
        );
        $stmt->execute(['userId' => $user['id']]);
        $rows = $stmt->fetchAll();

        $result = new \stdClass();
        foreach ($rows as $row) {
            $result->{$row['eventId']} = $row['status'];
        }

        $response = $response->withHeader('Cache-Control', 'private, no-store');
        return Helpers::jsonResponse($response, $result);
    }

    /**
     * Validate the datetime half of a feed cursor.
     *
     * The cursor carries the raw column value rather than an ISO string:
     * Observation.date is a DATETIME(3) and Helpers::toISOString hardcodes
     * `.000`, so round-tripping through it would drop the milliseconds and the
     * `o.date = ?` half of the keyset would stop matching its own row.
     *
     * A malformed value yields a date far in the future, which just returns the
     * first page instead of erroring on a tampered cursor.
     */
    private static function cursorDateToSql(?string $value): string
    {
        $valid = $value !== null
            && preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?$/', $value) === 1;
        return $valid ? $value : '9999-12-31 23:59:59';
    }

    public static function feed(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();
        $cursor = $request->getQueryParams()['cursor'] ?? null;
        // Cursor-paginated, so only the limit half of the helper is used here.
        ['limit' => $limit] = Helpers::paginationParams($request, 20, 20);

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

        // Keyset on the same columns the query sorts by. This used to filter on
        // `o.id < ?` while ordering by date: ids are cuids, which are neither
        // monotonic nor correlated with the observation date, so the cursor
        // dropped and repeated arbitrary rows. Unnoticed only because no caller
        // passed a cursor yet.
        $cursorCondition = '';
        $cursorDate = null;
        $cursorId = null;
        if ($cursor !== null && str_contains($cursor, '|')) {
            [$cursorDate, $cursorId] = explode('|', $cursor, 2);
            $cursorCondition = 'AND (o.date < ? OR (o.date = ? AND o.id < ?))';
        }

        // EXISTS rather than a join to ObservationEvent: an observation
        // attached to two of the user's events matched twice, and the DISTINCT
        // that hid it also forced a temp table and filesort.
        $sql = "SELECT o.id, o.date,
                       u.id as u_id, u.name as u_name, u.email as u_email, u.image as u_image,
                       b.id as b_id, b.swedish as b_swedish, b.family as b_family, b.parentId as b_parentId, b.kategori as b_kategori, b.status as b_status, b.delisted as b_delisted
                FROM Observation o
                JOIN User u ON u.id = o.userId
                JOIN Bird b ON b.id = o.birdId
                WHERE EXISTS (
                    SELECT 1 FROM ObservationEvent oe
                    WHERE oe.observationId = o.id AND oe.eventId IN ({$placeholders})
                )
                {$cursorCondition}
                ORDER BY o.date DESC, o.id DESC
                LIMIT ?";

        $queryParams = [...$eventIds];
        if ($cursorCondition !== '') {
            $queryParams[] = self::cursorDateToSql($cursorDate);
            $queryParams[] = self::cursorDateToSql($cursorDate);
            $queryParams[] = $cursorId;
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
                    'parentId' => $row['b_parentId'],
                    'kategori' => $row['b_kategori'],
                    'status' => $row['b_status'],
                    'delisted' => $row['b_delisted'],
                ],
            ];
        }, $items);

        // Both halves of the sort key, so the next page resumes exactly where
        // this one stopped even when several observations share a date.
        $nextCursor = null;
        if ($hasMore) {
            $last = $items[$limit - 1];
            $nextCursor = $last['date'] . '|' . $last['id'];
        }

        return Helpers::jsonResponse($response, [
            'items' => $formatted,
            'nextCursor' => $nextCursor,
        ]);
    }

    public static function lists(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        // Bounded by the same ceiling ListRoutes::create enforces, so a full
        // response is always the user's complete set — the UI reads this into a
        // global signal and renders it as chips in several sheets.
        $stmt = $db->prepare(
            'SELECT l.*, (SELECT COUNT(*) FROM ObservationList ol WHERE ol.listId = l.id) AS observationCount
             FROM `List` l
             WHERE l.userId = :userId
             ORDER BY l.createdAt DESC
             LIMIT :limit'
        );
        $stmt->bindValue('userId', $user['id']);
        $stmt->bindValue('limit', ListRoutes::MAX_LISTS_PER_USER, \PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        $result = array_map(fn($row) => [
            'id' => $row['id'],
            'name' => $row['name'],
            'description' => $row['description'],
            'createdAt' => Helpers::toISOString($row['createdAt']),
            'userId' => $row['userId'],
            'observationCount' => (int) $row['observationCount'],
        ], $rows);

        return Helpers::jsonResponse($response, $result);
    }
}
