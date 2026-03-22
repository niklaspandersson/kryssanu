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

class EventRoutes
{
    public static function register(App $app): void
    {
        $app->group('/api/events', function (RouteCollectorProxy $group) {
            $group->get('', [self::class, 'listEvents']);
            $group->post('', [self::class, 'create']);
            $group->get('/{id}', [self::class, 'getEvent']);
            $group->post('/{id}/invite', [self::class, 'invite']);
            $group->patch('/{id}/respond', [self::class, 'respond']);
            $group->put('/{id}/join', [self::class, 'join']);
            $group->get('/{id}/leaderboard', [self::class, 'leaderboard']);
            $group->get('/{id}/participants', [self::class, 'participants']);
            $group->get('/{id}/participants/{userId}/observations', [self::class, 'participantObservations']);
            $group->post('/{id}/invite-token', [self::class, 'createInviteToken']);
            $group->delete('/{id}/invite-token', [self::class, 'deleteInviteToken']);
        })->add(new AuthMiddleware());

        $app->post('/api/invite/{token}', [self::class, 'acceptInvite'])
            ->add(new AuthMiddleware());
    }

    /**
     * Build an event response with creator and observation count (no participants).
     */
    private static function buildEventResponse(\PDO $db, array $event): array
    {
        // Get creator
        $stmt = $db->prepare('SELECT id, name, email, image FROM User WHERE id = :id');
        $stmt->execute(['id' => $event['creatorId']]);
        $creator = Helpers::formatUserMinimal($stmt->fetch());

        // Get participant count (non-declined)
        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM Participant WHERE eventId = :eventId AND status != :declined'
        );
        $stmt->execute(['eventId' => $event['id'], 'declined' => 'DECLINED']);
        $participantCount = (int) $stmt->fetchColumn();

        // Get observation count
        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM ObservationEvent WHERE eventId = :eventId'
        );
        $stmt->execute(['eventId' => $event['id']]);
        $obsCount = (int) $stmt->fetchColumn();

        return [
            'id' => $event['id'],
            'name' => $event['name'],
            'description' => $event['description'],
            'isPublic' => (bool) $event['isPublic'],
            'startsAt' => Helpers::toISOString($event['startsAt']),
            'endsAt' => Helpers::toISOString($event['endsAt']),
            'createdAt' => Helpers::toISOString($event['createdAt']),
            'creatorId' => $event['creatorId'],
            'creator' => $creator,
            'participantCount' => $participantCount,
            'observationCount' => $obsCount,
        ];
    }

    public static function listEvents(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();
        $status = $request->getQueryParams()['status'] ?? null;
        $limit = min((int) ($request->getQueryParams()['limit'] ?? 50), 100);
        $offset = max((int) ($request->getQueryParams()['offset'] ?? 0), 0);

        // Build status filter in SQL
        $statusCondition = '';
        if ($status === 'active') {
            $statusCondition = 'AND e.startsAt <= NOW() AND e.endsAt >= NOW()';
        } elseif ($status === 'upcoming') {
            $statusCondition = 'AND e.startsAt > NOW()';
        } elseif ($status === 'past') {
            $statusCondition = 'AND e.endsAt < NOW()';
        }

        $sql = "SELECT DISTINCT e.* FROM Event e
                LEFT JOIN Participant p ON p.eventId = e.id AND p.userId = :userId2
                WHERE (e.creatorId = :userId OR (p.userId = :userId3 AND p.status != :declined) OR e.isPublic = 1)
                {$statusCondition}
                ORDER BY e.startsAt DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $db->prepare($sql);
        $stmt->bindValue('userId', $user['id']);
        $stmt->bindValue('userId2', $user['id']);
        $stmt->bindValue('userId3', $user['id']);
        $stmt->bindValue('declined', 'DECLINED');
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();
        $events = $stmt->fetchAll();

        $result = [];
        foreach ($events as $event) {
            $result[] = self::buildEventResponse($db, $event);
        }

        return Helpers::jsonResponse($response, $result);
    }

    public static function create(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $body = $request->getParsedBody() ?? [];
        $db = Database::getConnection();

        // Validate
        $errors = [];
        if (empty($body['name']) || !is_string($body['name'])) {
            $errors['name'] = ['String must contain at least 1 character(s)'];
        }
        if (empty($body['startsAt'])) {
            $errors['startsAt'] = ['Required'];
        }
        if (empty($body['endsAt'])) {
            $errors['endsAt'] = ['Required'];
        }

        // Validate date formats
        $startsAtTs = !empty($body['startsAt']) ? strtotime($body['startsAt']) : false;
        $endsAtTs = !empty($body['endsAt']) ? strtotime($body['endsAt']) : false;

        if (!empty($body['startsAt']) && $startsAtTs === false) {
            $errors['startsAt'] = ['Invalid date format'];
        }
        if (!empty($body['endsAt']) && $endsAtTs === false) {
            $errors['endsAt'] = ['Invalid date format'];
        }
        if ($startsAtTs && $endsAtTs && $endsAtTs <= $startsAtTs) {
            $errors['endsAt'] = ['End date must be after start date'];
        }

        if (!empty($errors)) {
            return Helpers::jsonResponse($response, [
                'error' => ['fieldErrors' => $errors, 'formErrors' => []],
            ], 400);
        }

        $eventId = Helpers::generateCuid();
        $now = Helpers::nowDatetime();

        $isPublic = !empty($body['isPublic']);

        $stmt = $db->prepare(
            'INSERT INTO Event (id, name, description, isPublic, startsAt, endsAt, createdAt, creatorId)
             VALUES (:id, :name, :description, :isPublic, :startsAt, :endsAt, :createdAt, :creatorId)'
        );
        $stmt->execute([
            'id' => $eventId,
            'name' => $body['name'],
            'description' => $body['description'] ?? null,
            'isPublic' => $isPublic ? 1 : 0,
            'startsAt' => gmdate('Y-m-d H:i:s', $startsAtTs),
            'endsAt' => gmdate('Y-m-d H:i:s', $endsAtTs),
            'createdAt' => $now,
            'creatorId' => $user['id'],
        ]);

        // Add creator as accepted participant
        $participantId = Helpers::generateCuid();
        $stmt = $db->prepare(
            'INSERT INTO Participant (id, userId, eventId, status, joinedAt)
             VALUES (:id, :userId, :eventId, :status, :joinedAt)'
        );
        $stmt->execute([
            'id' => $participantId,
            'userId' => $user['id'],
            'eventId' => $eventId,
            'status' => 'ACCEPTED',
            'joinedAt' => $now,
        ]);

        // Fetch and return
        $stmt = $db->prepare('SELECT * FROM Event WHERE id = :id');
        $stmt->execute(['id' => $eventId]);
        $event = $stmt->fetch();

        return Helpers::jsonResponse($response, self::buildEventResponse($db, $event), 201);
    }

    public static function getEvent(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM Event WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $event = $stmt->fetch();

        if (!$event) {
            return Helpers::jsonResponse($response, ['error' => 'Event not found'], 404);
        }

        // Check membership
        $stmt = $db->prepare(
            'SELECT 1 FROM Participant WHERE eventId = :eventId AND userId = :userId'
        );
        $stmt->execute(['eventId' => $args['id'], 'userId' => $user['id']]);
        $isParticipant = $stmt->fetch();
        $isCreator = $event['creatorId'] === $user['id'];

        if (!$isCreator && !$isParticipant && !$event['isPublic']) {
            return Helpers::jsonResponse($response, ['error' => 'Not a member of this event'], 403);
        }

        return Helpers::jsonResponse($response, self::buildEventResponse($db, $event));
    }

    public static function invite(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $body = $request->getParsedBody() ?? [];
        $db = Database::getConnection();

        // Validate email
        $email = $body['email'] ?? '';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return Helpers::jsonResponse($response, [
                'error' => ['fieldErrors' => ['email' => ['Invalid email']], 'formErrors' => []],
            ], 400);
        }

        // Check event exists and user is creator
        $stmt = $db->prepare('SELECT * FROM Event WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $event = $stmt->fetch();

        if (!$event) {
            return Helpers::jsonResponse($response, ['error' => 'Event not found'], 404);
        }
        if ($event['creatorId'] !== $user['id']) {
            return Helpers::jsonResponse($response, ['error' => 'Only the creator can invite'], 403);
        }

        // Find invitee
        $stmt = $db->prepare('SELECT * FROM User WHERE email = :email');
        $stmt->execute(['email' => $email]);
        $invitee = $stmt->fetch();

        if (!$invitee) {
            return Helpers::jsonResponse($response, ['error' => 'User not found'], 404);
        }

        // Upsert participant
        $stmt = $db->prepare(
            'SELECT * FROM Participant WHERE userId = :userId AND eventId = :eventId'
        );
        $stmt->execute(['userId' => $invitee['id'], 'eventId' => $args['id']]);
        $existing = $stmt->fetch();

        if ($existing) {
            $stmt = $db->prepare('UPDATE Participant SET status = :status WHERE id = :id');
            $stmt->execute(['status' => 'INVITED', 'id' => $existing['id']]);
        } else {
            $participantId = Helpers::generateCuid();
            $stmt = $db->prepare(
                'INSERT INTO Participant (id, userId, eventId, status, joinedAt)
                 VALUES (:id, :userId, :eventId, :status, :joinedAt)'
            );
            $stmt->execute([
                'id' => $participantId,
                'userId' => $invitee['id'],
                'eventId' => $args['id'],
                'status' => 'INVITED',
                'joinedAt' => Helpers::nowDatetime(),
            ]);
        }

        return Helpers::jsonResponse($response, [
            'user' => Helpers::formatUserMinimal($invitee),
            'status' => 'INVITED',
        ], 201);
    }

    public static function respond(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $body = $request->getParsedBody() ?? [];
        $db = Database::getConnection();

        // Validate
        $status = $body['status'] ?? '';
        if (!in_array($status, ['ACCEPTED', 'DECLINED'], true)) {
            return Helpers::jsonResponse($response, [
                'error' => ['fieldErrors' => ['status' => ['Invalid enum value']], 'formErrors' => []],
            ], 400);
        }

        // Find participant record
        $stmt = $db->prepare(
            'SELECT * FROM Participant WHERE userId = :userId AND eventId = :eventId'
        );
        $stmt->execute(['userId' => $user['id'], 'eventId' => $args['id']]);
        $participant = $stmt->fetch();

        if (!$participant) {
            return Helpers::jsonResponse($response, ['error' => 'No invitation found'], 404);
        }

        $stmt = $db->prepare(
            'UPDATE Participant SET status = :status, joinedAt = :joinedAt WHERE id = :id'
        );
        $stmt->execute([
            'status' => $status,
            'joinedAt' => Helpers::nowDatetime(),
            'id' => $participant['id'],
        ]);

        return Helpers::jsonResponse($response, ['status' => $status]);
    }

    public static function join(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM Event WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $event = $stmt->fetch();

        if (!$event) {
            return Helpers::jsonResponse($response, ['error' => 'Event not found'], 404);
        }

        if (!$event['isPublic']) {
            return Helpers::jsonResponse($response, ['error' => 'This event is not public'], 403);
        }

        $now = new \DateTime('now', new \DateTimeZone('UTC'));
        $end = new \DateTime($event['endsAt'], new \DateTimeZone('UTC'));
        if ($end < $now) {
            return Helpers::jsonResponse($response, ['error' => 'This event has ended'], 400);
        }

        // Upsert participant as ACCEPTED
        $stmt = $db->prepare(
            'SELECT * FROM Participant WHERE userId = :userId AND eventId = :eventId'
        );
        $stmt->execute(['userId' => $user['id'], 'eventId' => $args['id']]);
        $existing = $stmt->fetch();

        if ($existing) {
            if ($existing['status'] !== 'ACCEPTED') {
                $stmt = $db->prepare(
                    'UPDATE Participant SET status = :status, joinedAt = :joinedAt WHERE id = :id'
                );
                $stmt->execute([
                    'status' => 'ACCEPTED',
                    'joinedAt' => Helpers::nowDatetime(),
                    'id' => $existing['id'],
                ]);
            }
        } else {
            $participantId = Helpers::generateCuid();
            $stmt = $db->prepare(
                'INSERT INTO Participant (id, userId, eventId, status, joinedAt)
                 VALUES (:id, :userId, :eventId, :status, :joinedAt)'
            );
            $stmt->execute([
                'id' => $participantId,
                'userId' => $user['id'],
                'eventId' => $args['id'],
                'status' => 'ACCEPTED',
                'joinedAt' => Helpers::nowDatetime(),
            ]);
        }

        return Helpers::jsonResponse($response, self::buildEventResponse($db, $event));
    }

    public static function leaderboard(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM Event WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $event = $stmt->fetch();

        if (!$event) {
            return Helpers::jsonResponse($response, ['error' => 'Event not found'], 404);
        }

        // Get accepted participants
        $stmt = $db->prepare(
            'SELECT p.userId, u.id, u.name, u.email, u.image
             FROM Participant p
             JOIN User u ON u.id = p.userId
             WHERE p.eventId = :eventId AND p.status = :status'
        );
        $stmt->execute(['eventId' => $args['id'], 'status' => 'ACCEPTED']);
        $participants = $stmt->fetchAll();

        // Check membership
        $isMember = $event['creatorId'] === $user['id'] ||
            in_array($user['id'], array_column($participants, 'userId'));

        if (!$isMember && !$event['isPublic']) {
            return Helpers::jsonResponse($response, ['error' => 'Not a member of this event'], 403);
        }

        // Get observation events
        $stmt = $db->prepare(
            'SELECT oe.*, o.userId, o.birdId
             FROM ObservationEvent oe
             JOIN Observation o ON o.id = oe.observationId
             WHERE oe.eventId = :eventId'
        );
        $stmt->execute(['eventId' => $args['id']]);
        $observationEvents = $stmt->fetchAll();

        // Build stats per participant
        $statsMap = [];
        foreach ($participants as $p) {
            $statsMap[$p['userId']] = ['species' => [], 'total' => 0];
        }

        foreach ($observationEvents as $oe) {
            if (isset($statsMap[$oe['userId']])) {
                $statsMap[$oe['userId']]['species'][$oe['birdId']] = true;
                $statsMap[$oe['userId']]['total']++;
            }
        }

        // Build leaderboard
        $leaderboard = [];
        foreach ($participants as $p) {
            $s = $statsMap[$p['userId']];
            $leaderboard[] = [
                'user' => Helpers::formatUserMinimal($p),
                'uniqueSpecies' => count($s['species']),
                'totalObservations' => $s['total'],
            ];
        }

        // Sort by unique species descending
        usort($leaderboard, fn($a, $b) => $b['uniqueSpecies'] - $a['uniqueSpecies']);

        $response = $response->withHeader('Cache-Control', 'private, max-age=60');
        return Helpers::jsonResponse($response, $leaderboard);
    }

    public static function participants(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM Event WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $event = $stmt->fetch();

        if (!$event) {
            return Helpers::jsonResponse($response, ['error' => 'Event not found'], 404);
        }

        // Check membership
        $stmt = $db->prepare(
            'SELECT 1 FROM Participant WHERE eventId = :eventId AND userId = :userId'
        );
        $stmt->execute(['eventId' => $args['id'], 'userId' => $user['id']]);
        $isParticipant = $stmt->fetch();
        $isCreator = $event['creatorId'] === $user['id'];

        if (!$isCreator && !$isParticipant && !$event['isPublic']) {
            return Helpers::jsonResponse($response, ['error' => 'Not a member of this event'], 403);
        }

        $limit = min((int) ($request->getQueryParams()['limit'] ?? 20), 50);
        $offset = max((int) ($request->getQueryParams()['offset'] ?? 0), 0);

        $stmt = $db->prepare(
            'SELECT p.status, u.id, u.name, u.email, u.image
             FROM Participant p
             JOIN User u ON u.id = p.userId
             WHERE p.eventId = :eventId
             LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue('eventId', $args['id']);
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        $participants = [];
        while ($row = $stmt->fetch()) {
            $participants[] = [
                'user' => Helpers::formatUserMinimal($row),
                'status' => $row['status'],
            ];
        }

        $response = $response->withHeader('Cache-Control', 'private, max-age=60');
        return Helpers::jsonResponse($response, $participants);
    }

    public static function participantObservations(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM Event WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $event = $stmt->fetch();

        if (!$event) {
            return Helpers::jsonResponse($response, ['error' => 'Event not found'], 404);
        }

        // Check membership
        $stmt = $db->prepare(
            'SELECT p.userId FROM Participant p WHERE p.eventId = :eventId AND p.status = :status'
        );
        $stmt->execute(['eventId' => $args['id'], 'status' => 'ACCEPTED']);
        $acceptedUserIds = $stmt->fetchAll(\PDO::FETCH_COLUMN);

        $isMember = $event['creatorId'] === $user['id'] || in_array($user['id'], $acceptedUserIds);

        if (!$isMember && !$event['isPublic']) {
            return Helpers::jsonResponse($response, ['error' => 'Not a member of this event'], 403);
        }

        $limit = min((int) ($request->getQueryParams()['limit'] ?? 50), 100);
        $offset = max((int) ($request->getQueryParams()['offset'] ?? 0), 0);

        $stmt = $db->prepare(
            'SELECT o.*, b.id as b_id, b.swedish as b_swedish, b.family as b_family, b.visitor as b_visitor
             FROM ObservationEvent oe
             JOIN Observation o ON o.id = oe.observationId
             JOIN Bird b ON b.id = o.birdId
             WHERE oe.eventId = :eventId AND o.userId = :userId
             ORDER BY o.date DESC
             LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue('eventId', $args['id']);
        $stmt->bindValue('userId', $args['userId']);
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

    public static function createInviteToken(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM Event WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $event = $stmt->fetch();

        if (!$event) {
            return Helpers::jsonResponse($response, ['error' => 'Event not found'], 404);
        }
        if ($event['creatorId'] !== $user['id']) {
            return Helpers::jsonResponse($response, ['error' => 'Only the creator can manage invite tokens'], 403);
        }

        $now = new \DateTime('now', new \DateTimeZone('UTC'));
        $end = new \DateTime($event['endsAt'], new \DateTimeZone('UTC'));
        if ($end < $now) {
            return Helpers::jsonResponse($response, ['error' => 'Cannot create invite token for past events'], 400);
        }

        $stmt = $db->prepare('DELETE FROM InviteToken WHERE eventId = :eventId');
        $stmt->execute(['eventId' => $args['id']]);

        $tokenId = Helpers::generateCuid();
        $token = bin2hex(random_bytes(32));

        $stmt = $db->prepare(
            'INSERT INTO InviteToken (id, token, eventId, createdAt)
             VALUES (:id, :token, :eventId, :createdAt)'
        );
        $stmt->execute([
            'id' => $tokenId,
            'token' => $token,
            'eventId' => $args['id'],
            'createdAt' => Helpers::nowDatetime(),
        ]);

        $uri = $request->getUri();
        $scheme = $uri->getScheme();
        $host = $uri->getHost();
        $port = $uri->getPort();
        $baseUrl = "{$scheme}://{$host}";
        if ($port && $port !== 80 && $port !== 443) {
            $baseUrl .= ":{$port}";
        }
        $url = "{$baseUrl}/invite/{$token}";

        return Helpers::jsonResponse($response, ['token' => $token, 'url' => $url], 201);
    }

    public static function deleteInviteToken(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM Event WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $event = $stmt->fetch();

        if (!$event) {
            return Helpers::jsonResponse($response, ['error' => 'Event not found'], 404);
        }
        if ($event['creatorId'] !== $user['id']) {
            return Helpers::jsonResponse($response, ['error' => 'Only the creator can manage invite tokens'], 403);
        }

        $stmt = $db->prepare('DELETE FROM InviteToken WHERE eventId = :eventId');
        $stmt->execute(['eventId' => $args['id']]);

        return Helpers::jsonResponse($response, ['ok' => true]);
    }

    public static function acceptInvite(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM InviteToken WHERE token = :token');
        $stmt->execute(['token' => $args['token']]);
        $inviteToken = $stmt->fetch();

        if (!$inviteToken) {
            return Helpers::jsonResponse($response, ['error' => 'Invite link expired or invalid'], 404);
        }

        $eventId = $inviteToken['eventId'];

        $stmt = $db->prepare('SELECT * FROM Event WHERE id = :id');
        $stmt->execute(['id' => $eventId]);
        $event = $stmt->fetch();

        if (!$event) {
            return Helpers::jsonResponse($response, ['error' => 'Event not found'], 404);
        }

        $now = new \DateTime('now', new \DateTimeZone('UTC'));
        $end = new \DateTime($event['endsAt'], new \DateTimeZone('UTC'));
        if ($end < $now) {
            return Helpers::jsonResponse($response, ['error' => 'This event has ended'], 400);
        }

        // Upsert participant as ACCEPTED
        $stmt = $db->prepare(
            'SELECT * FROM Participant WHERE userId = :userId AND eventId = :eventId'
        );
        $stmt->execute(['userId' => $user['id'], 'eventId' => $eventId]);
        $existing = $stmt->fetch();

        if ($existing) {
            if ($existing['status'] !== 'ACCEPTED') {
                $stmt = $db->prepare(
                    'UPDATE Participant SET status = :status, joinedAt = :joinedAt WHERE id = :id'
                );
                $stmt->execute([
                    'status' => 'ACCEPTED',
                    'joinedAt' => Helpers::nowDatetime(),
                    'id' => $existing['id'],
                ]);
            }
        } else {
            $participantId = Helpers::generateCuid();
            $stmt = $db->prepare(
                'INSERT INTO Participant (id, userId, eventId, status, joinedAt)
                 VALUES (:id, :userId, :eventId, :status, :joinedAt)'
            );
            $stmt->execute([
                'id' => $participantId,
                'userId' => $user['id'],
                'eventId' => $eventId,
                'status' => 'ACCEPTED',
                'joinedAt' => Helpers::nowDatetime(),
            ]);
        }

        return Helpers::jsonResponse($response, ['eventId' => $eventId]);
    }
}
