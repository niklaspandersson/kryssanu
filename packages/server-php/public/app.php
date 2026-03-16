<?php

declare(strict_types=1);

use Slim\Factory\AppFactory;
use Slim\Psr7\Response;
use Kryssanu\Middleware\SessionMiddleware;

require __DIR__ . '/../vendor/autoload.php';

// Load .env in development
$envFile = dirname(__DIR__, 1) . '/.env';
if (file_exists($envFile)) {
    $dotenv = Dotenv\Dotenv::createImmutable(dirname(__DIR__, 1));
    $dotenv->load();
}

// Validate required env vars
$requiredVars = ['GOOGLE_CLIENT_ID', 'DATABASE_URL'];
foreach ($requiredVars as $var) {
    $val = $_ENV[$var] ?? getenv($var);
    if (empty($val)) {
        error_log("Missing required environment variable: {$var}");
        exit(1);
    }
}

$app = AppFactory::create();

// Parse JSON body
$app->addBodyParsingMiddleware();

// Session middleware (runs on every request)
$app->add(new SessionMiddleware());

// Error middleware
$app->addErrorMiddleware(
    displayErrorDetails: ($_ENV['APP_ENV'] ?? 'development') !== 'production',
    logErrors: true,
    logErrorDetails: true
)->setDefaultErrorHandler(function ($request, $exception, $displayErrorDetails) use ($app) {
    $response = $app->getResponseFactory()->createResponse();
    error_log("Unhandled error: " . $exception->getMessage());
    $response->getBody()->write(json_encode(['error' => 'Internal server error']));
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus(500);
});

// Register routes
$routeFiles = [
    'AuthRoutes',
    'BirdRoutes',
    'UserRoutes',
    'ObservationRoutes',
    'StatsRoutes',
    'EventRoutes',
    'FeedRoutes',
];
foreach ($routeFiles as $routeClass) {
    $class = "Kryssanu\\Routes\\{$routeClass}";
    $class::register($app);
}

$app->run();
