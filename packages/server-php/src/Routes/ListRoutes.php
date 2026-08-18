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

class ListRoutes
{
    /** Guardrail, not a UX limit — see create(). Mirrored by MeRoutes::lists. */
    public const MAX_LISTS_PER_USER = 200;

    public static function register(App $app): void
    {
        $app->group('/api/lists', function (RouteCollectorProxy $group) {
            $group->post('', [self::class, 'create']);
            $group->get('/{id}', [self::class, 'getOne']);
            $group->patch('/{id}', [self::class, 'update']);
            $group->delete('/{id}', [self::class, 'delete']);
            $group->get('/{id}/observations', [self::class, 'observations']);
            $group->post('/{id}/observations', [self::class, 'addObservation']);
            $group->delete('/{id}/observations/{obsId}', [self::class, 'removeObservation']);
        })->add(new AuthMiddleware());
    }

    /**
     * Build a list response with observation count.
     */
    private static function buildListResponse(\PDO $db, array $list): array
    {
        $stmt = $db->prepare('SELECT COUNT(*) FROM ObservationList WHERE listId = :listId');
        $stmt->execute(['listId' => $list['id']]);
        $obsCount = (int) $stmt->fetchColumn();

        return [
            'id' => $list['id'],
            'name' => $list['name'],
            'description' => $list['description'],
            'createdAt' => Helpers::toISOString($list['createdAt']),
            'userId' => $list['userId'],
            'observationCount' => $obsCount,
        ];
    }

    public static function create(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $body = $request->getParsedBody() ?? [];
        $db = Database::getConnection();

        $errors = [];
        if (empty($body['name']) || !is_string($body['name'])) {
            $errors['name'] = ['String must contain at least 1 character(s)'];
        } elseif (strlen($body['name']) > 100) {
            $errors['name'] = ['String must contain at most 100 character(s)'];
        }
        if (isset($body['description']) && strlen($body['description']) > 500) {
            $errors['description'] = ['String must contain at most 500 character(s)'];
        }

        if (!empty($errors)) {
            return Helpers::jsonResponse($response, [
                'error' => ['fieldErrors' => $errors, 'formErrors' => []],
            ], 400);
        }

        // Nothing else caps how many lists a user can create, and /me/lists is
        // loaded into a global signal that several sheets render as chips. The
        // ceiling is far above any real use — it exists so the endpoint cannot
        // grow without bound, not to shape the UX.
        $stmt = $db->prepare('SELECT COUNT(*) FROM `List` WHERE userId = :userId');
        $stmt->execute(['userId' => $user['id']]);
        if ((int) $stmt->fetchColumn() >= self::MAX_LISTS_PER_USER) {
            return Helpers::jsonResponse($response, [
                'error' => [
                    'fieldErrors' => [],
                    'formErrors' => [
                        'Du har nått det maximala antalet listor (' . self::MAX_LISTS_PER_USER . ').',
                    ],
                ],
            ], 400);
        }

        $listId = Helpers::generateCuid();
        $now = Helpers::nowDatetime();

        $stmt = $db->prepare(
            'INSERT INTO `List` (id, name, description, createdAt, userId)
             VALUES (:id, :name, :description, :createdAt, :userId)'
        );
        $stmt->execute([
            'id' => $listId,
            'name' => $body['name'],
            'description' => $body['description'] ?? null,
            'createdAt' => $now,
            'userId' => $user['id'],
        ]);

        $stmt = $db->prepare('SELECT * FROM `List` WHERE id = :id');
        $stmt->execute(['id' => $listId]);
        $list = $stmt->fetch();

        return Helpers::jsonResponse($response, self::buildListResponse($db, $list), 201);
    }

    public static function getOne(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM `List` WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $list = $stmt->fetch();

        if (!$list || $list['userId'] !== $user['id']) {
            return Helpers::jsonResponse($response, ['error' => 'List not found'], 404);
        }

        return Helpers::jsonResponse($response, self::buildListResponse($db, $list));
    }

    public static function update(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $body = $request->getParsedBody() ?? [];
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM `List` WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $list = $stmt->fetch();

        if (!$list || $list['userId'] !== $user['id']) {
            return Helpers::jsonResponse($response, ['error' => 'List not found'], 404);
        }

        $errors = [];
        if (isset($body['name'])) {
            if (!is_string($body['name']) || $body['name'] === '') {
                $errors['name'] = ['String must contain at least 1 character(s)'];
            } elseif (strlen($body['name']) > 100) {
                $errors['name'] = ['String must contain at most 100 character(s)'];
            }
        }
        if (isset($body['description']) && $body['description'] !== null && strlen($body['description']) > 500) {
            $errors['description'] = ['String must contain at most 500 character(s)'];
        }
        if (!empty($errors)) {
            return Helpers::jsonResponse($response, [
                'error' => ['fieldErrors' => $errors, 'formErrors' => []],
            ], 400);
        }

        $sets = [];
        $params = ['id' => $args['id']];
        if (isset($body['name'])) {
            $sets[] = 'name = :name';
            $params['name'] = $body['name'];
        }
        if (array_key_exists('description', $body)) {
            $sets[] = 'description = :description';
            $params['description'] = $body['description'];
        }

        if (!empty($sets)) {
            $sql = 'UPDATE `List` SET ' . implode(', ', $sets) . ' WHERE id = :id';
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
        }

        $stmt = $db->prepare('SELECT * FROM `List` WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $list = $stmt->fetch();

        return Helpers::jsonResponse($response, self::buildListResponse($db, $list));
    }

    public static function delete(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM `List` WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $list = $stmt->fetch();

        if (!$list || $list['userId'] !== $user['id']) {
            return Helpers::jsonResponse($response, ['error' => 'List not found'], 404);
        }

        $stmt = $db->prepare('DELETE FROM `List` WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);

        return Helpers::jsonResponse($response, ['ok' => true]);
    }

    public static function observations(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM `List` WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $list = $stmt->fetch();

        if (!$list || $list['userId'] !== $user['id']) {
            return Helpers::jsonResponse($response, ['error' => 'List not found'], 404);
        }

        ['limit' => $limit, 'offset' => $offset] = Helpers::paginationParams($request, 100, 200);

        $stmt = $db->prepare(
            'SELECT o.*, b.id as b_id, b.swedish as b_swedish, b.family as b_family, b.parentId as b_parentId, b.kategori as b_kategori, b.status as b_status, b.delisted as b_delisted
             FROM ObservationList ol
             JOIN Observation o ON o.id = ol.observationId
             JOIN Bird b ON b.id = o.birdId
             WHERE ol.listId = :listId
             ORDER BY o.date DESC
             LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue('listId', $args['id']);
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

    public static function addObservation(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $body = $request->getParsedBody() ?? [];
        $db = Database::getConnection();

        $observationId = $body['observationId'] ?? '';
        if (!is_string($observationId) || $observationId === '') {
            return Helpers::jsonResponse($response, [
                'error' => ['fieldErrors' => ['observationId' => ['Required']], 'formErrors' => []],
            ], 400);
        }

        $stmt = $db->prepare('SELECT * FROM `List` WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $list = $stmt->fetch();

        if (!$list || $list['userId'] !== $user['id']) {
            return Helpers::jsonResponse($response, ['error' => 'List not found'], 404);
        }

        $stmt = $db->prepare('SELECT userId FROM Observation WHERE id = :id');
        $stmt->execute(['id' => $observationId]);
        $obs = $stmt->fetch();

        if (!$obs || $obs['userId'] !== $user['id']) {
            return Helpers::jsonResponse($response, ['error' => 'Observation not found'], 404);
        }

        $stmt = $db->prepare(
            'SELECT 1 FROM ObservationList WHERE observationId = :obsId AND listId = :listId'
        );
        $stmt->execute(['obsId' => $observationId, 'listId' => $args['id']]);
        if (!$stmt->fetch()) {
            $stmt = $db->prepare(
                'INSERT INTO ObservationList (observationId, listId, addedAt) VALUES (:obsId, :listId, :addedAt)'
            );
            $stmt->execute([
                'obsId' => $observationId,
                'listId' => $args['id'],
                'addedAt' => Helpers::nowDatetime(),
            ]);
        }

        return Helpers::jsonResponse($response, ['ok' => true], 201);
    }

    public static function removeObservation(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM `List` WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $list = $stmt->fetch();

        if (!$list || $list['userId'] !== $user['id']) {
            return Helpers::jsonResponse($response, ['error' => 'List not found'], 404);
        }

        $stmt = $db->prepare(
            'DELETE FROM ObservationList WHERE observationId = :obsId AND listId = :listId'
        );
        $stmt->execute(['obsId' => $args['obsId'], 'listId' => $args['id']]);

        return Helpers::jsonResponse($response, ['ok' => true]);
    }
}
