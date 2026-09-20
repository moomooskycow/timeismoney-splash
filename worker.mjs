/* global Request, Response, Headers, URL, console */
import health from './api/health.js';
import relay from './api/canary/api/v1/errors.js';

/**
 * Cloudflare Worker entrypoint for the Time is Money splash.
 *
 * server.js (the DigitalOcean sidecar adapter) owns the routing contract;
 * this worker mirrors it for the Workers runtime so every host serves the
 * same surface:
 *
 *   - GET/HEAD /api/health               -> api/health.js
 *   - POST     /api/canary/api/v1/errors -> api/canary/api/v1/errors.js
 *   - any other path                     -> static assets via ASSETS binding
 *
 * wrangler.jsonc runs this worker first for /api/* only; every other path is
 * served straight from static assets. The entry is ESM (.mjs) so Node can
 * parse and test it without a package.json: the repo is zero-dependency by
 * contract (see scripts/ci.js).
 */

const API_ROUTES = new Map([
  ['/api/health', health],
  ['/api/canary/api/v1/errors', relay],
]);

/** Adapts the api handlers' setHeader/status/json/end contract onto Response. */
class ResponseAdapter {
  constructor() {
    this.headers = new Headers();
    this.statusCode = 200;
    this.payload = undefined;
    this.ended = false;
  }

  setHeader(name, value) {
    this.headers.set(name, value);
    return this;
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  json(payload) {
    if (!this.headers.has('Content-Type')) {
      this.headers.set('Content-Type', 'application/json; charset=utf-8');
    }
    this.payload = payload;
    this.ended = true;
    return this;
  }

  end() {
    this.ended = true;
    return this;
  }

  toResponse() {
    return new Response(
      this.payload === undefined ? null : JSON.stringify(this.payload),
      { status: this.statusCode, headers: this.headers }
    );
  }
}

/**
 * Adapts a Fetch API Request into the Node request shape the api handlers
 * read: method, url (path + query), a lowercase header map, and a pre-read
 * body string. The handlers prefer `req.body` when present, so the body is
 * never read twice.
 */
function adaptRequest(request, bodyText) {
  const url = new URL(request.url);
  return {
    method: request.method,
    url: url.pathname + url.search,
    headers: Object.fromEntries(request.headers),
    body: bodyText,
  };
}

function jsonError(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function handleApiRequest(request) {
  const { pathname } = new URL(request.url);
  const handler = API_ROUTES.get(pathname);
  if (!handler) return jsonError(404, { error: 'Not found' });

  const bodyText =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.text();

  const response = new ResponseAdapter();
  await handler(adaptRequest(request, bodyText), response);
  return response.toResponse();
}

export default {
  async fetch(request, env) {
    try {
      const { pathname } = new URL(request.url);
      if (pathname === '/api' || pathname.startsWith('/api/')) {
        return await handleApiRequest(request);
      }
      return await env.ASSETS.fetch(request);
    } catch (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          service: 'timeismoney-splash',
          operation: 'request',
          error: error instanceof Error ? error.message : 'unknown error',
        })
      );
      return jsonError(500, { error: 'Internal server error' });
    }
  },
};
