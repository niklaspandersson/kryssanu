<?php

declare(strict_types=1);

namespace Kryssanu\Middleware;

use Kryssanu\Helpers;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

class AuthMiddleware implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $user = $request->getAttribute('user');

        if (!$user) {
            $response = new \Slim\Psr7\Response();
            return Helpers::jsonResponse($response, ['error' => 'Unauthorized'], 401);
        }

        return $handler->handle($request);
    }
}
