# CLAUDE.md

Static splash page for the Time is Money Chrome extension - converts prices to hours of work.

## Project

- **Type:** Static HTML/CSS/JS (no build step)
- **Theme:** Retro Americana (red, blue, cream, gold)
- **Fonts:** Clash Display (local WOFF2), Geist (Google Fonts)

## Structure

```
├── index.html      # All sections
├── css/styles.css  # Theme + animations
├── js/app.js       # Interactivity (carousel, calculator)
├── js/sentry.js    # Browser Sentry bootstrap (config-injected, no-op when disabled)
├── api/health.js   # Liveness endpoint (sidecar + Worker)
├── api/sentry-config.js # Injectable browser-monitoring config
├── api/canary/api/v1/errors.js # 410 tombstone for the retired relay
├── worker.mjs      # Cloudflare Worker entry (assets + api routes)
├── server.js       # DigitalOcean sidecar adapter (soak/rollback origin)
├── scripts/ci.js   # Local CI gate used by GitHub Actions
├── scripts/verify-retirement.js # Liveness + tombstone + config contract checks
├── scripts/verify-browser.js    # vm-sandbox check of js/sentry.js
├── scripts/verify-server.js     # DigitalOcean sidecar adapter verification
├── scripts/verify-worker.js     # Worker route verification
└── favicon.ico
```

## Development

```bash
# Open in browser
open index.html

# Or any static server
python3 -m http.server 8000

# Contract checks
node scripts/verify-retirement.js
node scripts/verify-browser.js

# Verify Worker routing locally
node scripts/verify-worker.js

# Run the full local CI gate
node scripts/ci.js

# Run the Worker locally (assets + api routes)
wrangler dev --env staging
```

## URLs

- Chrome Store: https://chromewebstore.google.com/detail/time-is-money/ooppbnomdcjmoepangldchpmjhkeendl
- Production: https://timeismoney.mistystep.io (custom domains attach at the registrar flip)
- Staging: https://timeismoney-splash-staging.misty-step.workers.dev

## Observability notes

- `GET /api/health` is liveness only; it never proves error delivery.
- The retired legacy relay answers 410 for every method and never reads or
  forwards request bodies. Kept until a separate removal decision.
- Browser error collection runs through the official Sentry browser SDK and
  is enabled by a deploy-provided `SENTRY_DSN` (see README). Never commit a
  DSN and never invent one.
