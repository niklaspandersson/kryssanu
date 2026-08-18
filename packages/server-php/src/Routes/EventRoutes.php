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
        ['limit' => $limit, 'offset' => $offset] = Helpers::paginationParams($request, 50, 100);

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

        if (!self::isMember($db, $args['id'], $user['id'], $event) && !$event['isPublic']) {
            return Helpers::jsonResponse($response, ['error' => 'Not a member of this event'], 403);
        }

        ['limit' => $limit, 'offset' => $offset] = Helpers::paginationParams($request, 20, 50);

        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM Participant WHERE eventId = :eventId AND status = :status'
        );
        $stmt->execute(['eventId' => $args['id'], 'status' => 'ACCEPTED']);
        $total = (int) $stmt->fetchColumn();

        $scores = self::leaderboardScoresSql('Main');
        $stmt = $db->prepare(
            "SELECT t.uniqueSpecies, t.totalObservations, u.id, u.name, u.email, u.image
             FROM ({$scores}) t
             JOIN User u ON u.id = t.userId
             ORDER BY t.uniqueSpecies DESC, t.totalObservations DESC, u.id ASC
             LIMIT :limit OFFSET :offset"
        );
        $stmt->bindValue('innerEventMain', $args['id']);
        $stmt->bindValue('outerEventMain', $args['id']);
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        $entries = [];
        while ($row = $stmt->fetch()) {
            $entries[] = [
                'user' => Helpers::formatUserMinimal($row),
                'uniqueSpecies' => (int) $row['uniqueSpecies'],
                'totalObservations' => (int) $row['totalObservations'],
            ];
        }

        $response = $response->withHeader('Cache-Control', 'private, max-age=60');
        return Helpers::jsonResponse($response, [
            'entries' => $entries,
            'total' => $total,
            'me' => self::leaderboardRankFor($db, $args['id'], $user['id']),
        ]);
    }

    /**
     * One scored row per accepted participant, including those who have logged
     * nothing.
     *
     * The observation side is aggregated in its own derived table before being
     * joined to Participant. Joining the two directly would pair every
     * participant with every observation in the event first and only then
     * group — a cross product that is worse than the PHP aggregation this
     * replaced. Grouping first means the event's observations are scanned once,
     * via ObservationEvent(eventId).
     *
     * Prepared statements are not emulated (see Database.php), so a named
     * parameter cannot appear twice; callers embedding this more than once pass
     * a distinct $suffix per copy and bind `innerEvent{$suffix}` /
     * `outerEvent{$suffix}`.
     */
    private static function leaderboardScoresSql(string $suffix): string
    {
        return
            "SELECT p.userId,
                    COALESCE(s.uniqueSpecies, 0) AS uniqueSpecies,
                    COALESCE(s.totalObservations, 0) AS totalObservations
             FROM Participant p
             LEFT JOIN (
                 SELECT o.userId,
                        COUNT(DISTINCT o.birdId) AS uniqueSpecies,
                        COUNT(*) AS totalObservations
                 FROM ObservationEvent oe
                 JOIN Observation o ON o.id = oe.observationId
                 WHERE oe.eventId = :innerEvent{$suffix}
                 GROUP BY o.userId
             ) s ON s.userId = p.userId
             WHERE p.eventId = :outerEvent{$suffix} AND p.status = 'ACCEPTED'";
    }

    /**
     * The caller's own leaderboard row and rank, or null if they are not an
     * accepted participant.
     *
     * The client used to derive this by scanning the whole leaderboard, which
     * a paginated response no longer allows. Ranking happens in SQL so the
     * result is one scalar rather than every participant's row, and the tie
     * breaks must stay identical to the listing query or the rank disagrees
     * with the rows around it.
     *
     * @return array{rank: int, entry: array}|null
     */
    private static function leaderboardRankFor(\PDO $db, string $eventId, string $userId): ?array
    {
        $mineSql = self::leaderboardScoresSql('Mine');
        $stmt = $db->prepare(
            "SELECT t.uniqueSpecies, t.totalObservations, u.id, u.name, u.email, u.image
             FROM ({$mineSql}) t
             JOIN User u ON u.id = t.userId
             WHERE t.userId = :userId"
        );
        $stmt->execute([
            'innerEventMine' => $eventId,
            'outerEventMine' => $eventId,
            'userId' => $userId,
        ]);
        $mine = $stmt->fetch();

        if (!$mine) {
            return null;
        }

        $rankSql = self::leaderboardScoresSql('Rank');
        $stmt = $db->prepare(
            "SELECT COUNT(*) FROM ({$rankSql}) t
             WHERE t.uniqueSpecies > :uniqueSpecies
                OR (t.uniqueSpecies = :uniqueSpecies2 AND t.totalObservations > :totalObservations)
                OR (t.uniqueSpecies = :uniqueSpecies3 AND t.totalObservations = :totalObservations2
                    AND t.userId < :userId)"
        );
        $stmt->execute([
            'innerEventRank' => $eventId,
            'outerEventRank' => $eventId,
            'userId' => $userId,
            'uniqueSpecies' => $mine['uniqueSpecies'],
            'uniqueSpecies2' => $mine['uniqueSpecies'],
            'uniqueSpecies3' => $mine['uniqueSpecies'],
            'totalObservations' => $mine['totalObservations'],
            'totalObservations2' => $mine['totalObservations'],
        ]);

        return [
            'rank' => (int) $stmt->fetchColumn() + 1,
            'entry' => [
                'user' => Helpers::formatUserMinimal($mine),
                'uniqueSpecies' => (int) $mine['uniqueSpecies'],
                'totalObservations' => (int) $mine['totalObservations'],
            ],
        ];
    }

    /**
     * Whether a user may see an event's contents: its creator, or an accepted
     * participant. A single indexed lookup — the callers used to load every
     * participant row just to run in_array() over it.
     */
    private static function isMember(\PDO $db, string $eventId, string $userId, array $event): bool
    {
        if ($event['creatorId'] === $userId) {
            return true;
        }

        $stmt = $db->prepare(
            'SELECT 1 FROM Participant
             WHERE eventId = :eventId AND userId = :userId AND status = :status'
        );
        $stmt->execute(['eventId' => $eventId, 'userId' => $userId, 'status' => 'ACCEPTED']);
        return (bool) $stmt->fetchColumn();
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

        ['limit' => $limit, 'offset' => $offset] = Helpers::paginationParams($request, 20, 50);

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

        if (!self::isMember($db, $args['id'], $user['id'], $event) && !$event['isPublic']) {
            return Helpers::jsonResponse($response, ['error' => 'Not a member of this event'], 403);
        }

        ['limit' => $limit, 'offset' => $offset] = Helpers::paginationParams($request, 50, 100);

        $stmt = $db->prepare(
            'SELECT o.*, b.id as b_id, b.swedish as b_swedish, b.family as b_family, b.parentId as b_parentId, b.kategori as b_kategori, b.status as b_status, b.delisted as b_delisted
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
                'parentId' => $row['b_parentId'],
                'kategori' => $row['b_kategori'],
                'status' => $row['b_status'],
                'delisted' => $row['b_delisted'],
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

        // Keep the token valid for a short grace period after the QR code is
        // closed, so in-flight scans can still join.
        $validUntil = gmdate('Y-m-d H:i:s', time() + 300);
        $stmt = $db->prepare(
            'UPDATE InviteToken SET validUntil = :validUntil
             WHERE eventId = :eventId AND validUntil IS NULL'
        );
        $stmt->execute(['validUntil' => $validUntil, 'eventId' => $args['id']]);

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

        if ($inviteToken['validUntil'] !== null) {
            $now = new \DateTime('now', new \DateTimeZone('UTC'));
            $validUntil = new \DateTime($inviteToken['validUntil'], new \DateTimeZone('UTC'));
            if ($validUntil < $now) {
                return Helpers::jsonResponse($response, ['error' => 'Invite link expired or invalid'], 404);
            }
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
