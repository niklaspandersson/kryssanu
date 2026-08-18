<?php

declare(strict_types=1);

namespace Kryssanu;

use Visus\Cuid2\Cuid2;

class Helpers
{
    public static function generateCuid(): string
    {
        return (new Cuid2())->toString();
    }

    /**
     * Absolute path to the directory where uploaded observation images are
     * stored. Configurable via IMAGE_UPLOAD_DIR; defaults to a `user-images`
     * folder inside the PHP server package. Created on first use.
     */
    public static function imageDir(): string
    {
        $configured = $_ENV['IMAGE_UPLOAD_DIR'] ?? getenv('IMAGE_UPLOAD_DIR') ?: null;
        // Helpers.php lives in packages/server-php/src, so dirname(__DIR__) is the package root.
        $dir = $configured ?: dirname(__DIR__) . '/user-images';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        return rtrim($dir, '/');
    }

    /**
     * Format a datetime string to ISO 8601 matching JS toISOString().
     * Input: MySQL datetime string (e.g., "2024-01-15 10:30:00")
     * Output: "2024-01-15T10:30:00.000Z"
     */
    public static function toISOString(string $datetime): string
    {
        $dt = new \DateTime($datetime, new \DateTimeZone('UTC'));
        return $dt->format('Y-m-d\TH:i:s.') . '000Z';
    }

    /**
     * Get current datetime as MySQL-compatible string.
     */
    public static function nowDatetime(): string
    {
        return gmdate('Y-m-d H:i:s');
    }

    /**
     * Read the `limit`/`offset` query params, clamped to a usable range.
     *
     * The lower bound matters as much as the upper one: PDO binds a negative
     * limit straight through as `LIMIT -1`, which MySQL rejects as a syntax
     * error, so `?limit=-1` surfaces as a 500 rather than an empty page.
     * Non-numeric values fall back to the default instead of casting to 0.
     *
     * @return array{limit: int, offset: int}
     */
    public static function paginationParams(
        \Psr\Http\Message\ServerRequestInterface $request,
        int $default,
        int $max
    ): array {
        $params = $request->getQueryParams();
        $rawLimit = $params['limit'] ?? null;
        $rawOffset = $params['offset'] ?? null;

        return [
            'limit' => min(max(is_numeric($rawLimit) ? (int) $rawLimit : $default, 1), $max),
            'offset' => max(is_numeric($rawOffset) ? (int) $rawOffset : 0, 0),
        ];
    }

    /**
     * Return JSON response from a Slim response object.
     */
    public static function jsonResponse(
        \Psr\Http\Message\ResponseInterface $response,
        mixed $data,
        int $status = 200
    ): \Psr\Http\Message\ResponseInterface {
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }

    /**
     * Format a Bird row from DB for JSON output.
     *
     * Observation queries join in only the handful of bird columns they need,
     * so every field past the name is optional here and falls back to null.
     */
    public static function formatBird(array $row): array
    {
        return [
            'id' => $row['id'],
            'swedish' => $row['swedish'],
            'english' => $row['english'] ?? null,
            'family' => $row['family'],
            'familyLatin' => $row['familyLatin'] ?? null,
            'orderLatin' => $row['orderLatin'] ?? null,
            'orderSwedish' => $row['orderSwedish'] ?? null,
            // A bird with a parent is a subspecies.
            'parentId' => $row['parentId'] ?? null,
            // Fyndkategori A-E and status H/h/F/T/R, straight from
            // Sverigelistan. Every listed taxon has a category; status is null
            // for kategori E taxa, which RK assigns no Swedish status. Empty
            // means the bird is no longer listed, so report it as null.
            'kategori' => ($row['kategori'] ?? '') !== '' ? $row['kategori'] : null,
            'status' => ($row['status'] ?? '') !== '' ? $row['status'] : null,
            'extinct' => (bool) ($row['extinct'] ?? false),
            'delisted' => (bool) ($row['delisted'] ?? false),
        ];
    }

    /**
     * Format a User row for JSON output.
     *
     * Only ever used for the signed-in user — everyone else goes through
     * formatUserMinimal — so it is safe to include their settings here.
     */
    public static function formatUser(array $row): array
    {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'image' => $row['image'],
            'city' => $row['city'] ?? null,
            'about' => $row['about'] ?? null,
            // Decoded as an object, not an associative array: json_decode('{}',
            // true) gives [], which re-encodes to [] and reaches the client as
            // an array where it expects an object.
            'settings' => self::decodeSettings($row['settings'] ?? null),
        ];
    }

    /**
     * Decode a stored settings blob. Always yields an object, so a user who has
     * never saved a preference still gets {} rather than null or [].
     */
    public static function decodeSettings(?string $json): object
    {
        if ($json === null || $json === '') {
            return new \stdClass();
        }
        $decoded = json_decode($json);
        return $decoded instanceof \stdClass ? $decoded : new \stdClass();
    }

    /**
     * Format a User row for minimal JSON output (no city/about).
     */
    public static function formatUserMinimal(array $row): array
    {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'image' => $row['image'],
        ];
    }

    /**
     * Format an Observation row for JSON output.
     */
    public static function formatObservation(array $row): array
    {
        $obs = [
            'id' => $row['id'],
            'date' => self::toISOString($row['date']),
            'location' => $row['location'],
            'latitude' => isset($row['latitude']) ? (float) $row['latitude'] : null,
            'longitude' => isset($row['longitude']) ? (float) $row['longitude'] : null,
            'note' => $row['note'],
            'createdAt' => self::toISOString($row['createdAt']),
            'updatedAt' => self::toISOString($row['updatedAt']),
            'birdId' => $row['birdId'],
            'userId' => $row['userId'],
        ];

        // Only present when the query LEFT JOINs the observation's first image
        // (selected as `img_id`). Null when the observation has no image.
        if (array_key_exists('img_id', $row)) {
            $obs['image'] = $row['img_id'] ? self::formatImage($row['img_id']) : null;
        }

        return $obs;
    }

    /**
     * Build the public image reference (URLs to the large + thumb variants).
     */
    public static function formatImage(string $id): array
    {
        return [
            'id' => $id,
            'url' => "/api/images/{$id}",
            'thumbUrl' => "/api/images/{$id}/thumb",
        ];
    }
}
