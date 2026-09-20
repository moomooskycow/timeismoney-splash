#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');

function assetEnv() {
  const requested = [];
  return {
    requested,
    env: {
      ASSETS: {
        fetch: async (request) => {
          requested.push(new URL(request.url).pathname);
          return new Response('<!doctype html><title>asset</title>', {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        },
      },
    },
  };
}

function relayRequest(host, origin, body, extraHeaders = {}) {
  return new Request(`https://${host}/api/canary/api/v1/errors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Host: host,
      Origin: origin,
      Referer: `${origin}/`,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

async function main() {
  const worker = (
    await import(pathToFileURL(path.join(ROOT, 'worker.mjs')).href)
  ).default;

  process.env.CANARY_API_KEY = 'test-key';
  process.env.CANARY_SERVICE_NAME = 'timeismoney-splash';
  process.env.CANARY_ENDPOINT = 'https://canary.example.test';
  process.env.NEXT_PUBLIC_SITE_URL = 'https://timeismoney.mistystep.io';
  process.env.NODE_ENV = 'production';

  const { env, requested } = assetEnv();

  let forwarded;
  const realFetch = global.fetch;
  global.fetch = async (url, init) => {
    forwarded = { url: String(url), init, body: JSON.parse(init.body) };
    return new Response('{}', { status: 202 });
  };

  try {
    // --- /api/health: GET / HEAD / 405 ---
    let response = await worker.fetch(
      new Request('https://www.timeismoney.works/api/health'),
      env
    );
    assert.equal(response.status, 200);
    let body = await response.json();
    assert.equal(body.dependencies.canary, 'configured');
    assert.equal(body.observability.canary.status, 'configured');

    response = await worker.fetch(
      new Request('https://www.timeismoney.works/api/health', {
        method: 'HEAD',
      }),
      env
    );
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '');

    response = await worker.fetch(
      new Request('https://www.timeismoney.works/api/health', {
        method: 'POST',
      }),
      env
    );
    assert.equal(response.status, 405);

    delete process.env.CANARY_API_KEY;
    response = await worker.fetch(
      new Request('https://www.timeismoney.works/api/health'),
      env
    );
    assert.equal(response.status, 503);
    assert.equal(
      (await response.json()).observability.canary.status,
      'not_configured'
    );
    process.env.CANARY_API_KEY = 'test-key';

    // --- relay: accepted, redacted, forwarded with the bearer key ---
    response = await worker.fetch(
      relayRequest('www.timeismoney.works', 'https://www.timeismoney.works', {
        message:
          'user test@example.com failed with Bearer abc123 and token=secret',
        error_class: 'WorkerSmokeTest',
        severity: 'info',
        stack_trace: 'fetch https://example.com/path?token=secret#frag',
        context: {
          authorization: 'Bearer abc123',
          nested: { email: 'admin@example.com', dsn: 'sntryu_abc123456' },
        },
        fingerprint: ['timeismoney', 'token=secret'],
      }),
      env
    );
    assert.equal(response.status, 202);
    assert.equal((await response.json()).status, 'accepted');
    assert.equal(forwarded.url, 'https://canary.example.test/api/v1/errors');
    assert.equal(forwarded.init.headers.Authorization, 'Bearer test-key');
    assert.equal(forwarded.body.service, 'timeismoney-splash');
    assert.equal(forwarded.body.message.includes('test@example.com'), false);
    assert.equal(forwarded.body.message.includes('Bearer abc123'), false);
    assert.equal(forwarded.body.stack_trace.includes('?token='), false);
    assert.equal(forwarded.body.context.authorization, '[redacted]');
    assert.equal(forwarded.body.context.nested.email, '[EMAIL_REDACTED]');
    assert.equal(forwarded.body.context.nested.dsn, '[redacted]');
    assert.equal(forwarded.body.fingerprint[1], 'token=[REDACTED]');

    // --- relay: the mistystep.io custom domain is an allowed same-origin host ---
    response = await worker.fetch(
      relayRequest(
        'timeismoney.mistystep.io',
        'https://timeismoney.mistystep.io',
        { message: 'mistystep soak host' }
      ),
      env
    );
    assert.equal(response.status, 202);

    // --- relay: rejections (bad origin, spoofed hosts, wrong method) ---
    response = await worker.fetch(
      relayRequest('www.timeismoney.works', 'https://evil.example', {
        message: 'blocked origin',
      }),
      env
    );
    assert.equal(response.status, 403);

    response = await worker.fetch(
      relayRequest('evil.example', 'https://www.timeismoney.works', {
        message: 'blocked host spoof',
      }),
      env
    );
    assert.equal(response.status, 403);

    response = await worker.fetch(
      relayRequest('evil.example', 'https://www.timeismoney.works', {
        message: 'blocked forwarded host spoof',
      }, { 'X-Forwarded-Host': 'www.timeismoney.works' }),
      env
    );
    assert.equal(response.status, 403);

    response = await worker.fetch(
      new Request('https://www.timeismoney.works/api/canary/api/v1/errors'),
      env
    );
    assert.equal(response.status, 405);

    // --- relay: the local rate limiter still bounds a single client ---
    for (let attempt = 1; attempt <= 31; attempt += 1) {
      response = await worker.fetch(
        relayRequest(
          'www.timeismoney.works',
          'https://www.timeismoney.works',
          { message: `rate limit ${attempt}` },
          { 'X-Forwarded-For': '198.51.100.77' }
        ),
        env
      );
      assert.equal(response.status, attempt <= 30 ? 202 : 429);
    }

    // --- unknown /api paths are worker-owned 404s, never asset lookups ---
    response = await worker.fetch(
      new Request('https://www.timeismoney.works/api/does-not-exist'),
      env
    );
    assert.equal(response.status, 404);
    assert.deepEqual(requested, []);

    // --- non-api paths fall through to static assets ---
    response = await worker.fetch(
      new Request('https://www.timeismoney.works/'),
      env
    );
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '<!doctype html><title>asset</title>');
    assert.deepEqual(requested, ['/']);
  } finally {
    global.fetch = realFetch;
  }

  console.log('timeismoney Worker adapter verification passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
