<?php

declare(strict_types=1);

putenv(
    'GIT_SSH_COMMAND=ssh -F /dev/null -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null'
);

header('Content-Type: application/json; charset=utf-8');

const TOKEN = '12344321$';

const BASE_DIR = __DIR__;
const DATA_DIR = BASE_DIR . '/data';
const HYMNS_DIR = DATA_DIR . '/himnos';
const INDEX_FILE = DATA_DIR . '/index.json';
const LOCK_FILE = DATA_DIR . '/api.lock';

function releaseLock($lock): void
{
    if (is_resource($lock)) {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function fail(string $message, int $status = 400, $lock = null): never
{
    releaseLock($lock);

    http_response_code($status);

    echo json_encode([
        'ok' => false,
        'error' => $message
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    exit;
}

function ok(array $data, $lock = null): never
{
    releaseLock($lock);

    echo json_encode(
        ['ok' => true] + $data,
        JSON_PRETTY_PRINT |
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );

    exit;
}

function run(string $cmd): array
{
    exec($cmd . ' 2>&1', $output, $code);

    return [
        'code' => $code,
        'output' => trim(implode("\n", $output))
    ];
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail('Method not allowed', 405);
}

$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

if ($auth !== 'Bearer ' . TOKEN) {
    fail('Unauthorized', 401);
}

$raw = file_get_contents('php://input');

if (!$raw) {
    fail('Empty body');
}

$data = json_decode($raw, true);

if (!is_array($data)) {
    fail('Invalid JSON');
}

$lock = fopen(LOCK_FILE, 'c');

if (!$lock) {
    fail('Cannot open lock file', 500);
}

if (!flock($lock, LOCK_EX)) {
    fail('Cannot acquire lock', 500, $lock);
}

$indexRaw = file_get_contents(INDEX_FILE);

if ($indexRaw === false) {
    fail('Cannot read index.json', 500, $lock);
}

$index = json_decode($indexRaw, true);

if (!is_array($index)) {
    fail('Invalid index.json', 500, $lock);
}

if (($data['action'] ?? '') === 'delete') {

    $targetId = trim((string)($data['id'] ?? ''));

    if ($targetId === '') {
        fail('Missing id', 400, $lock);
    }

    $foundFile = null;

    foreach ($index as $file) {

        $path = HYMNS_DIR . '/' . $file;

        if (!file_exists($path)) {
            continue;
        }

        $content = file_get_contents($path);

        if ($content === false) {
            continue;
        }

        $json = json_decode($content, true);

        if (!is_array($json)) {
            continue;
        }

        if (($json['id'] ?? '') === $targetId) {
            $foundFile = $file;
            break;
        }
    }

    if (!$foundFile) {
        fail('Hymn not found', 404, $lock);
    }

    $targetPath = HYMNS_DIR . '/' . $foundFile;

    if (!unlink($targetPath)) {
        fail('Cannot delete hymn', 500, $lock);
    }

    $index = array_values(
        array_filter(
            $index,
            fn($v) => $v !== $foundFile
        )
    );

    $indexJson = json_encode(
        $index,
        JSON_PRETTY_PRINT |
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );

    if ($indexJson === false) {
        fail('Cannot encode index', 500, $lock);
    }

    $result = file_put_contents(
        INDEX_FILE,
        $indexJson . PHP_EOL,
        LOCK_EX
    );

    if ($result === false) {
        fail('Cannot write index', 500, $lock);
    }

    $commands = [
        'git -C ' . escapeshellarg(BASE_DIR) . ' add -A',
        'git -C ' . escapeshellarg(BASE_DIR) . ' commit -m ' . escapeshellarg("Eliminar {$targetId}"),
        'git -C ' . escapeshellarg(BASE_DIR) . ' push origin main'
    ];

    foreach ($commands as $cmd) {

        $result = run($cmd);

        if ($result['code'] !== 0) {
            fail('Git operation failed', 500, $lock);
        }
    }

    ok([
        'deleted' => $targetId,
        'archivo' => $foundFile
    ], $lock);
}

$required = [
    'titulo',
    'autor',
    'tonalidad',
    'tempo',
    'categorias',
    'letra'
];

foreach ($required as $field) {
    if (!array_key_exists($field, $data)) {
        fail("Missing field: {$field}");
    }
}

if (!is_array($data['categorias'])) {
    fail('categorias must be array');
}

$numbers = [];

foreach ($index as $file) {

    if (
        is_string($file) &&
        preg_match('/^(\d+)\.json$/', $file, $m)
    ) {
        $numbers[] = (int)$m[1];
    }
}

$next = empty($numbers)
    ? 1
    : max($numbers) + 1;

$padded = str_pad((string)$next, 3, '0', STR_PAD_LEFT);

$filename = $padded . '.json';

$hymn = [
    'id' => 'himno' . $padded,
    'referencia' => trim((string)($data['referencia'] ?? (string)$next)),
    'titulo' => trim((string)$data['titulo']),
    'autor' => trim((string)$data['autor']),
    'tonalidad' => trim((string)$data['tonalidad']),
    'tempo' => $data['tempo'],
    'categorias' => array_values($data['categorias']),
    'letra' => trim((string)$data['letra'])
];

$target = HYMNS_DIR . '/' . $filename;

if (file_exists($target)) {
    fail('Target hymn already exists', 500, $lock);
}

$hymnJson = json_encode(
    $hymn,
    JSON_PRETTY_PRINT |
    JSON_UNESCAPED_UNICODE |
    JSON_UNESCAPED_SLASHES
);

if ($hymnJson === false) {
    fail('Cannot encode hymn JSON', 500, $lock);
}

$result = file_put_contents(
    $target,
    $hymnJson . PHP_EOL,
    LOCK_EX
);

if ($result === false) {
    fail('Cannot write hymn', 500, $lock);
}

$index[] = $filename;

natsort($index);

$index = array_values($index);

$indexJson = json_encode(
    $index,
    JSON_PRETTY_PRINT |
    JSON_UNESCAPED_UNICODE |
    JSON_UNESCAPED_SLASHES
);

if ($indexJson === false) {
    fail('Cannot encode index JSON', 500, $lock);
}

$result = file_put_contents(
    INDEX_FILE,
    $indexJson . PHP_EOL,
    LOCK_EX
);

if ($result === false) {
    fail('Cannot write index', 500, $lock);
}

$commands = [
    'git -C ' . escapeshellarg(BASE_DIR) . ' add data/index.json',
    'git -C ' . escapeshellarg(BASE_DIR) . ' add ' . escapeshellarg('data/himnos/' . $filename),
    'git -C ' . escapeshellarg(BASE_DIR) . ' commit -m ' . escapeshellarg("Agregar himno {$next}"),
    'git -C ' . escapeshellarg(BASE_DIR) . ' push origin main'
];

foreach ($commands as $cmd) {

    $result = run($cmd);

    if ($result['code'] !== 0) {
        fail('Git operation failed', 500, $lock);
    }
}

ok([
    'archivo' => $filename,
    'id' => $hymn['id'],
    'referencia' => $hymn['referencia']
], $lock);
