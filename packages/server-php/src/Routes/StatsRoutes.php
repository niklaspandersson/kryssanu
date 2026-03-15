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

class StatsRoutes
{
    public static function register(App $app): void
    {
        $app->group('/api/stats', function (RouteCollectorProxy $group) {
            $group->get('/me', [self::class, 'myStats']);
            $group->get('/user/{userId}', [self::class, 'userStats']);
        })->add(new AuthMiddleware());
    }

    public static function myStats(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $stats = self::getUserStats($user['id']);
        return Helpers::jsonResponse($response, $stats);
    }

    public static function userStats(Request $request, Response $response, array $args): Response
    {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT id FROM User WHERE id = :id');
        $stmt->execute(['id' => $args['userId']]);

        if (!$stmt->fetch()) {
            return Helpers::jsonResponse($response, ['error' => 'User not found'], 404);
        }

        $stats = self::getUserStats($args['userId']);
        return Helpers::jsonResponse($response, $stats);
    }

    private static function getUserStats(string $userId): array
    {
        $db = Database::getConnection();
        $now = new \DateTime('now', new \DateTimeZone('UTC'));

        $startOfYear = $now->format('Y') . '-01-01 00:00:00';

        // Start of week (Monday)
        $dayOfWeek = (int) $now->format('N'); // 1=Mon, 7=Sun
        $daysBack = $dayOfWeek - 1;
        $startOfWeek = (clone $now)->modify("-{$daysBack} days")->format('Y-m-d') . ' 00:00:00';

        $startOfMonth = $now->format('Y-m') . '-01 00:00:00';

        // Unique species lifetime
        $stmt = $db->prepare(
            'SELECT COUNT(DISTINCT birdId) as cnt FROM Observation WHERE userId = :userId'
        );
        $stmt->execute(['userId' => $userId]);
        $lifetimeSpecies = (int) $stmt->fetchColumn();

        // Unique species this year
        $stmt = $db->prepare(
            'SELECT COUNT(DISTINCT birdId) as cnt FROM Observation WHERE userId = :userId AND date >= :startOfYear'
        );
        $stmt->execute(['userId' => $userId, 'startOfYear' => $startOfYear]);
        $yearSpecies = (int) $stmt->fetchColumn();

        // Total observations
        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM Observation WHERE userId = :userId'
        );
        $stmt->execute(['userId' => $userId]);
        $totalObservations = (int) $stmt->fetchColumn();

        // Observations this week
        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM Observation WHERE userId = :userId AND date >= :startOfWeek'
        );
        $stmt->execute(['userId' => $userId, 'startOfWeek' => $startOfWeek]);
        $weekObservations = (int) $stmt->fetchColumn();

        // Observations this month
        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM Observation WHERE userId = :userId AND date >= :startOfMonth'
        );
        $stmt->execute(['userId' => $userId, 'startOfMonth' => $startOfMonth]);
        $monthObservations = (int) $stmt->fetchColumn();

        // Latest observation
        $stmt = $db->prepare(
            'SELECT date FROM Observation WHERE userId = :userId ORDER BY date DESC LIMIT 1'
        );
        $stmt->execute(['userId' => $userId]);
        $latestDate = $stmt->fetchColumn();
        $latestObservation = $latestDate ? Helpers::toISOString($latestDate) : null;

        // Top 5 families
        $stmt = $db->prepare(
            'SELECT b.family, COUNT(*) as cnt
             FROM Observation o
             JOIN Bird b ON b.id = o.birdId
             WHERE o.userId = :userId
             GROUP BY b.family
             ORDER BY cnt DESC
             LIMIT 5'
        );
        $stmt->execute(['userId' => $userId]);
        $topFamilies = [];
        while ($row = $stmt->fetch()) {
            $topFamilies[] = ['family' => $row['family'], 'count' => (int) $row['cnt']];
        }

        return [
            'uniqueSpeciesLifetime' => $lifetimeSpecies,
            'uniqueSpeciesThisYear' => $yearSpecies,
            'totalObservations' => $totalObservations,
            'observationsThisWeek' => $weekObservations,
            'observationsThisMonth' => $monthObservations,
            'latestObservation' => $latestObservation,
            'topFamilies' => $topFamilies,
        ];
    }
}
