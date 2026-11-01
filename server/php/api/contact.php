<?php
// MTI AI SOLUTIONS — POST /api/contact proxy for PHP hosts (alternative to the Netlify Function).
// Env: CRM_URL, WEBSITE_FORM_SECRET, optional ALLOWED_ORIGINS. Requires PHP 8.1+ with cURL.
// Mirrors lib/lead-proxy.mjs: whitelist, honeypot, size cap, secret header, same status mapping.
// Detailed field validation is left to the CRM's 422 response.
declare(strict_types=1);

const MAX_BODY = 16384;
const GENERIC_ERROR = "We couldn't send your message right now. Please try again, or contact us directly.";
const LEAD_KEYS = ['name', 'business_email', 'company', 'phone', 'country', 'industry', 'interested_services',
    'timeline', 'message', 'consent', 'page_url', 'referrer', 'utm'];

function respond(int $status, array $body, array $headers = []): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    foreach ($headers as $name => $value) {
        header("$name: $value");
    }
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function log_line(string $message): void
{
    $secret = (string) getenv('WEBSITE_FORM_SECRET');
    if ($secret !== '') {
        $message = str_replace($secret, '[redacted]', $message);
    }
    error_log('[contact] ' . $message);
}

function cut(string $value, int $length): string
{
    return function_exists('mb_substr') ? mb_substr($value, 0, $length) : substr($value, 0, $length);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['message' => 'Method not allowed.'], ['Allow' => 'POST']);
}

$crmUrl = (string) getenv('CRM_URL');
$secret = (string) getenv('WEBSITE_FORM_SECRET');
if ($crmUrl === '' || $secret === '') {
    log_line('misconfigured: missing CRM_URL or WEBSITE_FORM_SECRET');
    respond(500, ['message' => GENERIC_ERROR]);
}

$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
$allowed = array_values(array_filter(array_map(fn ($o) => rtrim(trim($o), '/'), explode(',', (string) getenv('ALLOWED_ORIGINS')))));
if ($allowed) {
    $originOk = in_array($origin, $allowed, true);
} else {
    $parts = $origin !== '' ? parse_url($origin) : false;
    $originHost = $parts && isset($parts['host']) ? $parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : '') : '';
    $originOk = $originHost !== '' && $originHost === ($_SERVER['HTTP_HOST'] ?? '');
}
if (!$originOk) {
    log_line('rejected origin "' . cut($origin, 100) . '"');
    respond(403, ['message' => 'Forbidden.']);
}

if (stripos((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json') !== 0) {
    respond(415, ['message' => 'Content-Type must be application/json.']);
}

$raw = (string) file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
if (strlen($raw) > MAX_BODY) {
    respond(413, ['message' => 'Request is too large.']);
}
$data = json_decode($raw, true);
if (!is_array($data) || !(json_decode($raw) instanceof stdClass)) {
    respond(400, ['message' => 'Invalid JSON body.']);
}

$honeypot = $data['company_website'] ?? null;
if (is_string($honeypot) && trim($honeypot) !== '') {
    log_line('honeypot triggered; lead discarded');
    respond(201, ['status' => 'received']);
}

// Whitelist: anything outside the CRM contract (e.g. a budget field) is dropped.
$lead = [];
foreach (LEAD_KEYS as $key) {
    if (!array_key_exists($key, $data)) {
        continue;
    }
    $value = $data[$key];
    if (is_string($value)) {
        $value = trim($value);
    }
    if ($value === '' || $value === null || $value === []) {
        continue;
    }
    $lead[$key] = $value;
}
foreach (['page_url', 'referrer'] as $key) {
    if (isset($lead[$key]) && is_string($lead[$key])) {
        $lead[$key] = cut($lead[$key], 500);
    }
}
if (isset($lead['utm'])) {
    $utm = [];
    foreach (['source', 'medium', 'campaign'] as $key) {
        $value = is_array($lead['utm']) ? ($lead['utm'][$key] ?? null) : null;
        if (is_string($value) && trim($value) !== '') {
            $utm[$key] = cut(trim($value), 120);
        }
    }
    if ($utm) {
        $lead['utm'] = $utm;
    } else {
        unset($lead['utm']);
    }
}

$errors = [];
foreach (['name' => 'full name', 'business_email' => 'business email', 'company' => 'company name'] as $key => $label) {
    if (!is_string($lead[$key] ?? null)) {
        $errors[$key] = ["Please enter your $label."];
    }
}
if (($lead['consent'] ?? null) !== true) {
    $errors['consent'] = ['Please confirm that we may use your information to respond to your enquiry.'];
}
if ($errors) {
    respond(422, ['message' => 'Please check the highlighted fields.', 'errors' => $errors]);
}

$retryAfter = null;
$ch = curl_init(rtrim($crmUrl, '/') . '/api/website/leads');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($lead, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json', 'X-Website-Secret: ' . $secret],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_HEADERFUNCTION => function ($curl, string $line) use (&$retryAfter): int {
        if (stripos($line, 'Retry-After:') === 0) {
            $retryAfter = trim(substr($line, 12));
        }
        return strlen($line);
    },
]);
$response = curl_exec($ch);
if ($response === false) {
    log_line('CRM unreachable (curl error ' . curl_errno($ch) . ')');
    respond(502, ['message' => GENERIC_ERROR]);
}
$status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$payload = json_decode((string) $response, true);
$payload = is_array($payload) ? $payload : [];

switch ($status) {
    case 201:
        $reference = is_string($payload['reference'] ?? null) ? cut($payload['reference'], 64) : null;
        log_line('lead forwarded ref=' . ($reference ?? 'none'));
        respond(201, $reference !== null ? ['status' => 'received', 'reference' => $reference] : ['status' => 'received']);
    case 422:
        $crmErrors = [];
        foreach ((array) ($payload['errors'] ?? []) as $field => $messages) {
            if (in_array(explode('.', (string) $field)[0], LEAD_KEYS, true)) {
                $crmErrors[$field] = array_values(array_filter((array) $messages, 'is_string'));
            }
        }
        log_line('CRM 422 fields=[' . implode(',', array_keys((array) ($payload['errors'] ?? []))) . ']');
        respond(422, ['message' => is_string($payload['message'] ?? null) ? $payload['message'] : 'Please check the highlighted fields.', 'errors' => $crmErrors]);
    case 429:
        log_line('CRM 429 rate limited');
        respond(429, ['message' => 'Too many requests. Please try again later.'], $retryAfter ? ['Retry-After' => $retryAfter] : []);
    case 404:
        log_line('CRM returned 404: check WEBSITE_FORM_SECRET and CRM_URL');
        respond(502, ['message' => GENERIC_ERROR]);
    default:
        log_line('CRM returned ' . $status);
        respond(502, ['message' => GENERIC_ERROR]);
}
