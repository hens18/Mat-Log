// Runs PostgREST inside AWS Lambda, so the API costs nothing while idle.
//
// On a cold start the PostgREST binary (shipped next to this file) is copied
// to /tmp, marked executable (Windows-built zips can drop that bit), started
// on 127.0.0.1, and given up to READY_TIMEOUT_MS to connect to the database.
// Each request from API Gateway (HTTP API, payload v2) is then passed through
// unchanged, minus the /rest/v1 prefix supabase-js adds.
//
// Set POSTGREST_UPSTREAM to proxy to an already-running PostgREST instead
// (used by the tests).

import { spawn } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PORT = 3000;
const BASE_PATH = process.env.BASE_PATH ?? '/rest/v1';
// A paused Aurora database takes about 15 seconds to wake; API Gateway allows 30.
const READY_TIMEOUT_MS = Number(process.env.READY_TIMEOUT_MS ?? 25_000);
const SKIP_REQUEST_HEADERS = new Set(['host', 'content-length', 'connection', 'accept-encoding']);
const SKIP_RESPONSE_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
]);

let starting;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitUntilReady(base) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      // PostgREST answers 503 until it has connected and loaded its schema cache.
      const res = await fetch(`${base}/`);
      if (res.status < 500) return;
    } catch {
      // Not listening yet.
    }
    await sleep(100);
  }
  throw new Error('PostgREST did not become ready in time');
}

function launch() {
  const binary = '/tmp/postgrest';
  if (!existsSync(binary)) {
    copyFileSync(join(process.env.LAMBDA_TASK_ROOT ?? process.cwd(), 'postgrest'), binary);
    chmodSync(binary, 0o755);
  }
  const child = spawn(binary, [], {
    env: { ...process.env, PGRST_SERVER_HOST: '127.0.0.1', PGRST_SERVER_PORT: String(PORT) },
    stdio: 'inherit',
  });
  child.on('exit', (code) => {
    console.error(`PostgREST exited with code ${code}; it will restart on the next request`);
    starting = undefined;
  });
  return `http://127.0.0.1:${PORT}`;
}

async function upstream() {
  if (process.env.POSTGREST_UPSTREAM) return process.env.POSTGREST_UPSTREAM;
  starting ??= (async () => {
    const base = launch();
    await waitUntilReady(base);
    return base;
  })();
  try {
    return await starting;
  } catch (error) {
    starting = undefined;
    throw error;
  }
}

/** Converts an API Gateway HTTP API (v2) event into a request to PostgREST. */
export function toRequest(event, base) {
  const method = event.requestContext.http.method;
  let path = event.rawPath ?? '/';
  if (path.startsWith(BASE_PATH)) path = path.slice(BASE_PATH.length) || '/';
  const query = event.rawQueryString ? `?${event.rawQueryString}` : '';
  const headers = {};
  for (const [name, value] of Object.entries(event.headers ?? {})) {
    if (!SKIP_REQUEST_HEADERS.has(name.toLowerCase())) headers[name] = value;
  }
  if (event.cookies?.length) headers.cookie = event.cookies.join('; ');
  let body;
  if (event.body != null && method !== 'GET' && method !== 'HEAD') {
    body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
  }
  return { url: `${base}${path}${query}`, init: { method, headers, body } };
}

/** Converts PostgREST's response into an API Gateway (v2) result. */
export async function toResult(res) {
  const headers = {};
  res.headers.forEach((value, name) => {
    if (!SKIP_RESPONSE_HEADERS.has(name)) headers[name] = value;
  });
  const buffer = Buffer.from(await res.arrayBuffer());
  const type = res.headers.get('content-type') ?? '';
  const isText = buffer.length === 0 || /json|text|csv|xml|javascript|openapi/i.test(type);
  return {
    statusCode: res.status,
    headers,
    body: isText ? buffer.toString('utf8') : buffer.toString('base64'),
    isBase64Encoded: !isText,
  };
}

export async function handler(event) {
  const { url, init } = toRequest(event, await upstream());
  return toResult(await fetch(url, init));
}
