# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Time is Money landing page - A static HTML/CSS/JS marketing site for a Chrome extension that converts prices to hours of work. Zero build step, zero dependencies.

## Development

```bash
# Serve locally (any static server works)
python3 -m http.server 8000
# or
npx serve .

# Open in browser
open index.html

# Verify Canary health and relay behavior
node scripts/verify-canary.js

# Run the full local CI gate
node scripts/ci.js

# Verify deployed Canary ingest and readback
CANARY_READ_API_KEY=... node scripts/smoke-canary-production.js
```

## Architecture

### Tech Stack
- **HTML**: Single `index.html` file
- **CSS**: Vanilla CSS with custom properties (`css/styles.css`)
- **JavaScript**: Vanilla JS, no framework (`js/app.js`)
- **Fonts**: Clash Display (local WOFF2), Geist (Google Fonts CDN)

### Project Structure
```
├── index.html          # Single-page HTML
├── css/
│   └── styles.css      # All styles (~400 lines)
├── js/
│   └── app.js          # All interactivity (~200 lines)
├── scripts/
│   ├── verify-canary.js # Canary route verification
│   ├── ci.js            # Local CI gate used by GitHub Actions
│   ├── verify-worker.js # Cloudflare Worker adapter verification
│   └── smoke-canary-production.js # Production Canary smoke/readback
├── worker.mjs          # Cloudflare Worker entrypoint (API routes + assets)
├── server.js           # DigitalOcean sidecar adapter (soak/rollback origin)
├── api/
│   ├── health.js       # Health endpoint handler
│   └── canary/api/v1/errors.js  # Browser error relay to Canary
├── fonts/
│   └── ClashDisplay-Variable.woff2
├── images/
│   └── icon_640.png
└── favicon.ico
```

### Key Features
- **Demo Card Carousel**: Auto-rotates every 3.5s, pauses on hover, keyboard navigation (arrow keys)
- **Time Thieves Calculator**: Monthly/yearly toggle with animated counter
- **Chrome Install Buttons**: Loading state with spinner, opens Chrome Web Store

### Styling Approach
- CSS custom properties for colors, shadows, spacing
- Mobile-first responsive design (768px, 1024px breakpoints)
- No preprocessor, no build step

### External Integration
- Chrome Web Store: `https://chromewebstore.google.com/detail/time-is-money/ooppbnomdcjmoepangldchpmjhkeendl?hl=en`
- Google Fonts CDN for Geist font
- Canary: `/api/health` and `/api/canary/api/v1/errors` are served by the Cloudflare Worker (`worker.mjs`) and the DigitalOcean sidecar (`server.js`) from the same handlers; keep `CANARY_API_KEY` server-only.

### File Sizes
- `index.html`: ~20KB
- `css/styles.css`: ~28KB
- `js/app.js`: ~12KB
- `fonts/`: ~32KB
- **Total**: ~100KB (vs 546MB with Next.js)
