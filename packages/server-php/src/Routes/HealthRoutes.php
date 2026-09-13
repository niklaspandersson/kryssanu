<?php

declare(strict_types=1);

namespace Kryssanu\Routes;

use Kryssanu\Helpers;
use Slim\App;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class HealthRoutes
{
    public static function register(App $app): void
    {
        $app->get('/api/health', [self::class, 'check']);
    }

    /**
     * Reachability probe for the client's connectivity check. Deliberately
     * touches nothing — no database, no session — so the client can poll it
     * while it believes the network is down. Clients call it with credentials
     * omitted, which also keeps SessionMiddleware off the database.
     */
    public static function check(Request $request, Response $response): Response
    {
        $response = $response->withHeader('Cache-Control', 'no-store');
        return Helpers::jsonResponse($response, ['ok' => true]);
    }
}
