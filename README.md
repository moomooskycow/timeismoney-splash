# Time is Money - Landing Page

Static landing page for the [Time is Money Chrome extension](https://chromewebstore.google.com/detail/time-is-money/ooppbnomdcjmoepangldchpmjhkeendl).

## Quick Start

Open `index.html` in a browser, or serve locally:

```bash
python3 -m http.server 8000
```

Verify the Canary health and relay functions:

```bash
node scripts/verify-canary.js
```

Run the full local CI gate before shipping:

```bash
node scripts/ci.js
```

After a production deploy, verify live Canary ingest and readback:

```bash
CANARY_READ_API_KEY=... node scripts/smoke-canary-production.js
```

## Structure

```
├── index.html      # Single-page HTML
├── css/styles.css  # Vanilla CSS
├── js/app.js       # Vanilla JavaScript
├── js/canary.js    # Browser error observer
├── scripts/verify-canary.js # Local Canary route verification
├── scripts/ci.js # Local CI gate used by GitHub Actions
├── scripts/verify-worker.js # Cloudflare Worker adapter verification
├── scripts/smoke-canary-production.js # Production Canary smoke/readback
├── worker.mjs      # Cloudflare Worker entrypoint (API routes + assets)
├── server.js       # DigitalOcean sidecar adapter (soak/rollback origin)
├── api/health.js   # Health endpoint handler
├── api/canary/api/v1/errors.js # Browser error relay to Canary
├── fonts/          # Clash Display font
└── images/         # Extension icon
```

## Features

- Demo card carousel with auto-rotate
- Time thieves calculator with toggle
- Responsive design (mobile-first)
- Zero dependencies, zero build step
- Canary error reporting and production health checks via the app-owned relay

## Deploy

Production runs on Cloudflare Workers. One Worker serves the static site and
the API contract: `worker.mjs` routes `/api/*` to the same handlers as the
DigitalOcean sidecar (`api/health.js`, `api/canary/api/v1/errors.js`) and
serves every other path from the static assets (`wrangler.jsonc` +
`.assetsignore`). Deploy with `wrangler deploy --env staging` first, then
`wrangler deploy --env production`; production attaches the custom domains
(`timeismoney.mistystep.io`, `timeismoney.works`, `www.timeismoney.works`).
The registrar nameserver flip is separate and operator-gated: until it
completes, `timeismoney.works` and `www.timeismoney.works` keep serving from
the DigitalOcean Caddy origin and redirect to `timeismoney.mistystep.io`.

The Worker defines:

- `CANARY_API_KEY` - service-bound ingest key for `timeismoney-splash`
  (set as a Worker secret, never committed)
- `CANARY_ENDPOINT` - defaults to `https://canary.mistystep.io`
- `CANARY_SERVICE_NAME` - defaults to `timeismoney-splash`
- `NEXT_PUBLIC_SITE_URL` - extra allowed browser origin for the relay
  (`https://timeismoney.mistystep.io` in production, the workers.dev origin in
  staging). `https://www.timeismoney.works` and `https://timeismoney.works`
  are always allowed.

`/api/health` is a liveness/config check and returns `503` if Canary is not
configured. Use `scripts/smoke-canary-production.js` after deploy to prove
end-to-end Canary ingest.

Note: the Canary product is retired (Estate ADR 0003) and
`canary.mistystep.io` no longer exists. Until a replacement sink is
configured, `/api/health` reports `canary: not_configured` (`503` in
production) and the relay answers `503 Canary is not configured`. The
endpoints stay live so the custom-domain cutover does not regress; point
`CANARY_ENDPOINT` and `CANARY_API_KEY` at a live sink to re-enable
forwarding.

The DigitalOcean origin (`server.js` + Caddy on public-apps) remains the
soak/rollback path until the Cloudflare cutover is finished.
