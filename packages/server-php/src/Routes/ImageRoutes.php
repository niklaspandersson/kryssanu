<?php

declare(strict_types=1);

namespace Kryssanu\Routes;

use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use Kryssanu\Database;
use Kryssanu\Helpers;
use Kryssanu\Middleware\AuthMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\UploadedFileInterface;

class ImageRoutes
{
    /** Max accepted upload size in bytes (clients downscale before sending). */
    private const MAX_BYTES = 8 * 1024 * 1024;

    /** Accepted source image types (sniffed from bytes, not the client header). */
    private const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

    private const LARGE_WIDTH = 1200;
    private const THUMB_WIDTH = 400;

    public static function register(App $app): void
    {
        // Authed: attach/replace and remove an image on an owned observation.
        $app->group('/api/me/observations', function (RouteCollectorProxy $group) {
            $group->post('/{id}/images', [self::class, 'upload']);
            $group->delete('/{obsId}/images/{imageId}', [self::class, 'delete']);
        })->add(new AuthMiddleware());

        // Public: the bird's first image (with credit) + raw variant bytes.
        $app->get('/api/birds/{birdId}/images', [self::class, 'birdImages']);
        $app->get('/api/images/{id}', [self::class, 'serveLarge']);
        $app->get('/api/images/{id}/thumb', [self::class, 'serveThumb']);
    }

    public static function upload(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        // Ownership check.
        $stmt = $db->prepare('SELECT userId FROM Observation WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        $obs = $stmt->fetch();
        if (!$obs || $obs['userId'] !== $user['id']) {
            return Helpers::jsonResponse($response, ['error' => 'Observation not found'], 404);
        }

        /** @var UploadedFileInterface|null $file */
        $file = $request->getUploadedFiles()['image'] ?? null;
        if (!$file || $file->getError() !== UPLOAD_ERR_OK) {
            return Helpers::jsonResponse($response, ['error' => 'No image uploaded'], 400);
        }
        if ($file->getSize() !== null && $file->getSize() > self::MAX_BYTES) {
            return Helpers::jsonResponse($response, ['error' => 'Image too large'], 400);
        }

        $bytes = (string) $file->getStream();

        $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($bytes);
        if (!in_array($mime, self::ALLOWED_MIME, true)) {
            return Helpers::jsonResponse($response, ['error' => 'Unsupported image type'], 400);
        }

        $id = Helpers::generateCuid();
        $dir = Helpers::imageDir();

        try {
            $manager = new ImageManager(new Driver());

            $large = $manager->read($bytes)->scaleDown(width: self::LARGE_WIDTH);
            file_put_contents("{$dir}/{$id}_lg.webp", (string) $large->toWebp(80));

            $thumb = $manager->read($bytes)->scaleDown(width: self::THUMB_WIDTH);
            file_put_contents("{$dir}/{$id}_sm.webp", (string) $thumb->toWebp(80));
        } catch (\Throwable $e) {
            error_log('Image processing failed: ' . $e->getMessage());
            return Helpers::jsonResponse($response, ['error' => 'Could not process image'], 400);
        }

        $width = $large->width();
        $height = $large->height();

        // One image per observation: replace any existing one.
        self::deleteImagesForObservation($db, $args['id']);

        $stmt = $db->prepare(
            'INSERT INTO ObservationImage (id, observationId, width, height, createdAt)
             VALUES (:id, :observationId, :width, :height, :createdAt)'
        );
        $stmt->execute([
            'id' => $id,
            'observationId' => $args['id'],
            'width' => $width,
            'height' => $height,
            'createdAt' => Helpers::nowDatetime(),
        ]);

        return Helpers::jsonResponse($response, [
            'id' => $id,
            'observationId' => $args['id'],
            'width' => $width,
            'height' => $height,
            'createdAt' => Helpers::toISOString(Helpers::nowDatetime()),
            'url' => "/api/images/{$id}",
            'thumbUrl' => "/api/images/{$id}/thumb",
        ], 201);
    }

    public static function delete(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        $stmt = $db->prepare(
            'SELECT i.id, o.userId
             FROM ObservationImage i
             JOIN Observation o ON o.id = i.observationId
             WHERE i.id = :imageId AND i.observationId = :obsId'
        );
        $stmt->execute(['imageId' => $args['imageId'], 'obsId' => $args['obsId']]);
        $row = $stmt->fetch();

        if (!$row || $row['userId'] !== $user['id']) {
            return Helpers::jsonResponse($response, ['error' => 'Image not found'], 404);
        }

        self::unlinkVariants($args['imageId']);
        $db->prepare('DELETE FROM ObservationImage WHERE id = :id')
            ->execute(['id' => $args['imageId']]);

        return Helpers::jsonResponse($response, ['ok' => true]);
    }

    public static function birdImages(Request $request, Response $response, array $args): Response
    {
        $db = Database::getConnection();

        $stmt = $db->prepare(
            'SELECT i.id AS img_id, i.width, i.height,
                    o.location AS location, o.date AS obsDate, o.userId AS uploaderId,
                    u.name AS uploaderName
             FROM ObservationImage i
             JOIN Observation o ON o.id = i.observationId
             JOIN User u ON u.id = o.userId
             WHERE o.birdId = :birdId
             ORDER BY i.createdAt ASC
             LIMIT 1'
        );
        $stmt->execute(['birdId' => $args['birdId']]);
        $row = $stmt->fetch();

        // This pointer changes when images are added/removed, so it must not be
        // cached aggressively (the image bytes themselves are immutable + cached
        // separately, and offline reads come from the app's IndexedDB cache).
        $response = $response->withHeader('Cache-Control', 'no-cache');

        if (!$row) {
            return Helpers::jsonResponse($response, null);
        }

        return Helpers::jsonResponse($response, [
            'id' => $row['img_id'],
            'url' => "/api/images/{$row['img_id']}",
            'thumbUrl' => "/api/images/{$row['img_id']}/thumb",
            'uploaderId' => $row['uploaderId'],
            'uploaderName' => $row['uploaderName'],
            'year' => (int) date('Y', strtotime($row['obsDate'])),
            'location' => $row['location'],
            'width' => $row['width'] !== null ? (int) $row['width'] : null,
            'height' => $row['height'] !== null ? (int) $row['height'] : null,
        ]);
    }

    public static function serveLarge(Request $request, Response $response, array $args): Response
    {
        return self::serveFile($request, $response, $args['id'], 'lg');
    }

    public static function serveThumb(Request $request, Response $response, array $args): Response
    {
        return self::serveFile($request, $response, $args['id'], 'sm');
    }

    private static function serveFile(Request $request, Response $response, string $id, string $variant): Response
    {
        $path = Helpers::imageDir() . "/{$id}_{$variant}.webp";
        if (!is_file($path)) {
            return Helpers::jsonResponse($response, ['error' => 'Image not found'], 404);
        }

        $etag = '"' . $id . '_' . $variant . '"';
        if (trim($request->getHeaderLine('If-None-Match')) === $etag) {
            return $response
                ->withStatus(304)
                ->withHeader('ETag', $etag)
                ->withHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }

        $response->getBody()->write((string) file_get_contents($path));
        return $response
            ->withHeader('Content-Type', 'image/webp')
            ->withHeader('Cache-Control', 'public, max-age=31536000, immutable')
            ->withHeader('ETag', $etag);
    }

    /** Remove all image rows + files for an observation (used to replace). */
    private static function deleteImagesForObservation(\PDO $db, string $observationId): void
    {
        self::purgeObservationFiles($db, [$observationId]);
        $db->prepare('DELETE FROM ObservationImage WHERE observationId = :obsId')
            ->execute(['obsId' => $observationId]);
    }

    /**
     * Unlink the image files belonging to the given observations. Call this
     * before deleting observations (the DB cascade removes the rows, but not
     * the files on disk). No-op when the list is empty.
     *
     * @param string[] $observationIds
     */
    public static function purgeObservationFiles(\PDO $db, array $observationIds): void
    {
        if (empty($observationIds)) {
            return;
        }
        $placeholders = implode(',', array_fill(0, count($observationIds), '?'));
        $stmt = $db->prepare(
            "SELECT id FROM ObservationImage WHERE observationId IN ({$placeholders})"
        );
        $stmt->execute($observationIds);
        foreach ($stmt->fetchAll() as $row) {
            self::unlinkVariants($row['id']);
        }
    }

    /** Delete both variant files for an image id (ignoring missing files). */
    private static function unlinkVariants(string $id): void
    {
        $dir = Helpers::imageDir();
        foreach (['lg', 'sm'] as $variant) {
            $path = "{$dir}/{$id}_{$variant}.webp";
            if (is_file($path)) {
                @unlink($path);
            }
        }
    }
}
