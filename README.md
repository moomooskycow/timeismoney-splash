# Time is Money - Landing Page

Static landing page for the [Time is Money Chrome extension](https://chromewebstore.google.com/detail/time-is-money/ooppbnomdcjmoepangldchpmjhkeendl).

## Development

This is a static site. No build step required.

```bash
# Open directly in browser
open index.html

# Or use any static server
python3 -m http.server 8000
npx serve .

# Liveness, retirement, and config contracts
node scripts/verify-retirement.js

# Browser bootstrap (vm sandbox; proves disabled is a no-op)
node scripts/verify-browser.js

# Verify Worker routing locally
node scripts/verify-worker.js

# Run the full local CI gate
node scripts/ci.js

# Run the Worker locally (assets + api routes; needs wrangler 4.135+)
# Tip: if dev reload-loops, add `--persist-to /tmp/wrangler-state`; the
# local state churn under .wrangler/ can trip the file watcher when the
# assets directory is the repo root.
wrangler dev --env staging
```

## Structure

```
├── index.html      # Single-page HTML
├── css/styles.css  # Vanilla CSS
├── js/
│   ├── app.js      # Vanilla JavaScript
│   └── sentry.js   # Browser Sentry bootstrap (config-injected, no-op when disabled)
├── api/
│   ├── health.js               # Liveness endpoint (sidecar + Worker)
│   ├── sentry-config.js        # Injectable browser-monitoring config
│   └── canary/api/v1/errors.js # 410 tombstone for the retired relay
├── scripts/
│   ├── ci.js                # Local CI gate used by GitHub Actions
│   ├── verify-retirement.js # Liveness + tombstone + config contract checks
│   ├── verify-browser.js    # vm-sandbox check of js/sentry.js
│   ├── verify-server.js     # DigitalOcean sidecar adapter verification
│   └── verify-worker.js     # Cloudflare Worker adapter verification
├── worker.mjs      # Cloudflare Worker entrypoint (API routes + assets)
├── server.js       # DigitalOcean sidecar adapter (soak/rollback origin)
├── fonts/          # Clash Display font
└── images/         # Extension icon
```

## Features

- Demo card carousel with auto-rotate
- Time thieves calculator with toggle
- Responsive design (mobile-first)
- Zero dependencies, zero build step

## Observability

Production runs on Cloudflare Workers. One Worker serves the static site and
the API contract: `worker.mjs` routes `/api/*` to the same handlers as the
DigitalOcean sidecar (`server.js`), so the contract holds on both runtimes:

- `GET|HEAD /api/health` — site liveness only. HTTP 200 is never proof of
  error delivery.
- `GET|HEAD /api/sentry-config` — browser-monitoring config, injectable at
  deploy time.
- `any method /api/canary/api/v1/errors` — HTTP 410 tombstone. The old
  Canary relay is retired; the route never reads, stores, or forwards a
  request body.

Browser error collection is intentionally unavailable until a Sentry DSN is
provided at deploy time. The page loads the official `@sentry/browser`
bundle (pinned version) only when the config endpoint reports
`enabled: true`; errors then travel from the SDK straight to Sentry ingest.
The app owns no relay and stores nothing.

Both runtimes read the same environment names:

- `SENTRY_DSN` — public client-side DSN for the site's Sentry project.
  Unset means monitoring is off; no DSN is committed to this repository.
- `SENTRY_ENVIRONMENT` — `staging` or `production`
- `SENTRY_RELEASE` — optional release identifier
- `NODE_ENV` — fallback environment name

## Deploy

Production runs on Cloudflare Workers (`wrangler deploy --env staging`
first, then `wrangler deploy --env production`; production attaches the
custom domains `timeismoney.mistystep.io`, `timeismoney.works`, and
`www.timeismoney.works`). The registrar nameserver flip is separate and
operator-gated: until it completes, `timeismoney.works` and
`www.timeismoney.works` keep serving from the DigitalOcean Caddy origin and
redirect to `timeismoney.mistystep.io`.

The DigitalOcean origin (`server.js` + Caddy on public-apps) remains the
soak/rollback path until the Cloudflare cutover is finished.

## Links

- **Chrome Web Store:** [Install Time is Money](https://chromewebstore.google.com/detail/time-is-money/ooppbnomdcjmoepangldchpmjhkeendl)
