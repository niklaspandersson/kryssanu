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
     */
    public static function formatBird(array $row): array
    {
        return [
            'id' => $row['id'],
            'swedish' => $row['swedish'],
            'family' => $row['family'],
            'visitor' => (bool) $row['visitor'],
        ];
    }

    /**
     * Format a User row for public JSON output.
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
        ];
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
        return [
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
    }
}
