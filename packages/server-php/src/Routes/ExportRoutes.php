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

class ExportRoutes
{
    public static function register(App $app): void
    {
        $app->group('/api/export', function (RouteCollectorProxy $group) {
            $group->get('/google/authorize', [self::class, 'authorize'])->add(new AuthMiddleware());
            $group->get('/google/callback', [self::class, 'callback']);
            $group->post('/google/sheets', [self::class, 'exportToSheets'])->add(new AuthMiddleware());
        });
    }

    private static function getGoogleClient(): \Google\Client
    {
        $clientId = $_ENV['GOOGLE_CLIENT_ID'] ?? getenv('GOOGLE_CLIENT_ID');
        $clientSecret = $_ENV['GOOGLE_CLIENT_SECRET'] ?? getenv('GOOGLE_CLIENT_SECRET');
        $appUrl = $_ENV['APP_URL'] ?? getenv('APP_URL') ?: 'http://localhost:3000';

        $client = new \Google\Client();
        $client->setClientId($clientId);
        $client->setClientSecret($clientSecret);
        $client->setRedirectUri($appUrl . '/api/export/google/callback');
        $client->addScope('https://www.googleapis.com/auth/drive.file');
        $client->setAccessType('offline');
        $client->setPrompt('consent');
        $client->setIncludeGrantedScopes(true);

        return $client;
    }

    private static function generateState(string $sessionId): string
    {
        $state = bin2hex(random_bytes(32));
        $db = Database::getConnection();
        $stmt = $db->prepare('UPDATE Session SET oauthState = :state WHERE id = :sessionId');
        $stmt->execute(['state' => $state, 'sessionId' => $sessionId]);
        return $state;
    }

    private static function verifyState(string $state, string $sessionId): bool
    {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            'SELECT id FROM Session WHERE id = :sessionId AND oauthState = :state AND expiresAt > NOW()'
        );
        $stmt->execute(['sessionId' => $sessionId, 'state' => $state]);
        $row = $stmt->fetch();
        if (!$row) {
            return false;
        }
        // Clear the state so it can't be replayed
        $stmt = $db->prepare('UPDATE Session SET oauthState = NULL WHERE id = :sessionId');
        $stmt->execute(['sessionId' => $sessionId]);
        return true;
    }

    public static function authorize(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $cookies = $request->getCookieParams();
        $sessionId = $cookies['session'] ?? null;
        $db = Database::getConnection();

        $client = self::getGoogleClient();
        $client->setState(self::generateState($sessionId));

        // Only force consent if we don't have a refresh token yet
        $stmt = $db->prepare('SELECT refreshToken FROM GoogleToken WHERE userId = :userId');
        $stmt->execute(['userId' => $user['id']]);
        $tokenRow = $stmt->fetch();

        if ($tokenRow) {
            $client->setPrompt('');
        }

        if (!empty($user['email'])) {
            $client->setLoginHint($user['email']);
        }

        $authUrl = $client->createAuthUrl();

        return Helpers::jsonResponse($response, ['url' => $authUrl]);
    }

    public static function callback(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $code = $params['code'] ?? null;
        $state = $params['state'] ?? null;
        $error = $params['error'] ?? null;
        $appUrl = $_ENV['APP_URL'] ?? getenv('APP_URL') ?: 'http://localhost:3000';

        if ($error) {
            return $response
                ->withHeader('Location', $appUrl . '/profile?export=denied')
                ->withStatus(302);
        }

        $cookies = $request->getCookieParams();
        $sessionId = $cookies['session'] ?? null;

        if (!$code || !$state || !$sessionId) {
            return Helpers::jsonResponse($response, ['error' => 'Missing code, state, or session'], 400);
        }

        // Verify CSRF state against session cookie
        if (!self::verifyState($state, $sessionId)) {
            return Helpers::jsonResponse($response, ['error' => 'Invalid state'], 400);
        }

        // SessionMiddleware already resolved user from cookie
        $user = $request->getAttribute('user');
        if (!$user) {
            return $response
                ->withHeader('Location', $appUrl . '/profile?export=error')
                ->withStatus(302);
        }

        $db = Database::getConnection();
        $userId = $user['id'];

        try {
            // Exchange authorization code for tokens
            $client = self::getGoogleClient();
            $token = $client->fetchAccessTokenWithAuthCode($code);

            if (isset($token['error'])) {
                error_log("Google token exchange error: " . ($token['error_description'] ?? $token['error']));
                return $response
                    ->withHeader('Location', $appUrl . '/profile?export=error')
                    ->withStatus(302);
            }

            $accessToken = $token['access_token'];
            $refreshToken = $token['refresh_token'] ?? null;
            $expiresIn = $token['expires_in'] ?? 3600;
            $expiresAt = gmdate('Y-m-d H:i:s', time() + (int) $expiresIn);
            $scope = $token['scope'] ?? 'https://www.googleapis.com/auth/drive.file';

            if (!$refreshToken) {
                error_log("No refresh token received for user {$userId}");
                return $response
                    ->withHeader('Location', $appUrl . '/profile?export=error')
                    ->withStatus(302);
            }

            // Upsert GoogleToken
            $stmt = $db->prepare('SELECT id FROM GoogleToken WHERE userId = :userId');
            $stmt->execute(['userId' => $userId]);
            $existing = $stmt->fetch();

            if ($existing) {
                $stmt = $db->prepare(
                    'UPDATE GoogleToken SET accessToken = :accessToken, refreshToken = :refreshToken,
                     expiresAt = :expiresAt, scope = :scope, updatedAt = NOW() WHERE userId = :userId'
                );
                $stmt->execute([
                    'accessToken' => $accessToken,
                    'refreshToken' => $refreshToken,
                    'expiresAt' => $expiresAt,
                    'scope' => $scope,
                    'userId' => $userId,
                ]);
            } else {
                $stmt = $db->prepare(
                    'INSERT INTO GoogleToken (id, userId, accessToken, refreshToken, expiresAt, scope, createdAt, updatedAt)
                     VALUES (:id, :userId, :accessToken, :refreshToken, :expiresAt, :scope, NOW(), NOW())'
                );
                $stmt->execute([
                    'id' => Helpers::generateCuid(),
                    'userId' => $userId,
                    'accessToken' => $accessToken,
                    'refreshToken' => $refreshToken,
                    'expiresAt' => $expiresAt,
                    'scope' => $scope,
                ]);
            }

            return $response
                ->withHeader('Location', $appUrl . '/profile?export=ready')
                ->withStatus(302);
        } catch (\Exception $e) {
            error_log("Google OAuth callback error: " . $e->getMessage());
            return $response
                ->withHeader('Location', $appUrl . '/profile?export=error')
                ->withStatus(302);
        }
    }

    public static function exportToSheets(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $db = Database::getConnection();

        // Get stored tokens
        $stmt = $db->prepare('SELECT accessToken, refreshToken, expiresAt, createdAt FROM GoogleToken WHERE userId = :userId');
        $stmt->execute(['userId' => $user['id']]);
        $tokenRow = $stmt->fetch();

        if (!$tokenRow) {
            return Helpers::jsonResponse($response, ['error' => 'not_authorized'], 403);
        }

        try {
            $client = self::getGoogleClient();
            $client->setAccessToken([
                'access_token' => $tokenRow['accessToken'],
                'refresh_token' => $tokenRow['refreshToken'],
                'expires_in' => max(0, strtotime($tokenRow['expiresAt']) - time()),
                'created' => strtotime($tokenRow['createdAt']),
            ]);

            // Refresh if expired
            if ($client->isAccessTokenExpired()) {
                $newToken = $client->fetchAccessTokenWithRefreshToken($tokenRow['refreshToken']);
                if (isset($newToken['error'])) {
                    // Refresh token revoked – delete stored token
                    $stmt = $db->prepare('DELETE FROM GoogleToken WHERE userId = :userId');
                    $stmt->execute(['userId' => $user['id']]);
                    return Helpers::jsonResponse($response, ['error' => 'not_authorized'], 403);
                }

                // Update stored token
                $expiresAt = gmdate('Y-m-d H:i:s', time() + ($newToken['expires_in'] ?? 3600));
                $stmt = $db->prepare(
                    'UPDATE GoogleToken SET accessToken = :accessToken, expiresAt = :expiresAt, updatedAt = NOW() WHERE userId = :userId'
                );
                $stmt->execute([
                    'accessToken' => $newToken['access_token'],
                    'expiresAt' => $expiresAt,
                    'userId' => $user['id'],
                ]);
            }

            // Fetch all observations with bird data
            $stmt = $db->prepare(
                'SELECT o.date, o.location, o.latitude, o.longitude, o.note, b.swedish, b.id as birdId, b.family
                 FROM Observation o
                 JOIN Bird b ON b.id = o.birdId
                 WHERE o.userId = :userId
                 ORDER BY o.date ASC, b.swedish ASC'
            );
            $stmt->execute(['userId' => $user['id']]);
            $observations = $stmt->fetchAll();

            // Build spreadsheet data
            $header = ['Svenskt namn', 'Latinskt namn', 'Familj', 'Datum', 'Plats', 'Latitud', 'Longitud', 'Anteckning'];
            $rows = [$header];
            foreach ($observations as $obs) {
                $date = (new \DateTime($obs['date'], new \DateTimeZone('UTC')))->format('Y-m-d');
                $rows[] = [
                    $obs['swedish'],
                    $obs['birdId'],
                    $obs['family'],
                    $date,
                    $obs['location'] ?? '',
                    $obs['latitude'] ?? '',
                    $obs['longitude'] ?? '',
                    $obs['note'] ?? '',
                ];
            }

            // Create spreadsheet
            $sheetsService = new \Google\Service\Sheets($client);
            $userName = $user['name'] ?? 'Användare';
            $dateStr = date('Y-m-d');
            $title = "Kryssanu – {$userName} – {$dateStr}";

            $spreadsheet = new \Google\Service\Sheets\Spreadsheet([
                'properties' => ['title' => $title],
                'sheets' => [
                    [
                        'properties' => [
                            'title' => 'Observationer',
                            'gridProperties' => [
                                'frozenRowCount' => 1,
                            ],
                        ],
                        'data' => [
                            [
                                'startRow' => 0,
                                'startColumn' => 0,
                                'rowData' => array_map(function ($row) {
                                    return [
                                        'values' => array_map(function ($cell) {
                                            return [
                                                'userEnteredValue' => ['stringValue' => (string) $cell],
                                            ];
                                        }, $row),
                                    ];
                                }, $rows),
                            ],
                        ],
                    ],
                ],
            ]);

            $created = $sheetsService->spreadsheets->create($spreadsheet, [
                'fields' => 'spreadsheetId,spreadsheetUrl,sheets.properties.sheetId',
            ]);

            // Bold header row
            $sheetId = $created->getSheets()[0]->getProperties()->getSheetId();
            $boldRequest = new \Google\Service\Sheets\BatchUpdateSpreadsheetRequest([
                'requests' => [
                    [
                        'repeatCell' => [
                            'range' => [
                                'sheetId' => $sheetId,
                                'startRowIndex' => 0,
                                'endRowIndex' => 1,
                            ],
                            'cell' => [
                                'userEnteredFormat' => [
                                    'textFormat' => ['bold' => true],
                                    'backgroundColor' => [
                                        'red' => 0.9,
                                        'green' => 0.94,
                                        'blue' => 0.88,
                                    ],
                                ],
                            ],
                            'fields' => 'userEnteredFormat(textFormat,backgroundColor)',
                        ],
                    ],
                    [
                        'autoResizeDimensions' => [
                            'dimensions' => [
                                'sheetId' => $sheetId,
                                'dimension' => 'COLUMNS',
                                'startIndex' => 0,
                                'endIndex' => 6,
                            ],
                        ],
                    ],
                ],
            ]);
            $sheetsService->spreadsheets->batchUpdate($created->getSpreadsheetId(), $boldRequest);

            return Helpers::jsonResponse($response, [
                'spreadsheetId' => $created->getSpreadsheetId(),
                'spreadsheetUrl' => $created->getSpreadsheetUrl(),
            ]);
        } catch (\Google\Service\Exception $e) {
            error_log("Google Sheets API error: " . $e->getMessage());
            // If 401, token might be revoked
            if ($e->getCode() === 401) {
                $stmt = $db->prepare('DELETE FROM GoogleToken WHERE userId = :userId');
                $stmt->execute(['userId' => $user['id']]);
                return Helpers::jsonResponse($response, ['error' => 'not_authorized'], 403);
            }
            return Helpers::jsonResponse($response, ['error' => 'Failed to create spreadsheet'], 500);
        } catch (\Exception $e) {
            error_log("Export error: " . $e->getMessage());
            return Helpers::jsonResponse($response, ['error' => 'Export failed'], 500);
        }
    }
}
