# BACKLOG

Last groomed: 2025-12-01
Analyzed by: 15 expert perspectives (8 specialists + 7 master personas)

---

## Now (Sprint-Ready, <2 weeks)

### [INFRASTRUCTURE] Add Vitest Testing Framework
**File**: New: vitest.config.ts, lib/*.test.ts
**Perspectives**: architecture-guardian, maintainability-maven, beck, fowler, carmack (5 agents)
**Impact**: Zero test coverage blocks safe deploys - flying blind on regressions
**Fix**:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```
Start with pure functions: time calculations, carousel index, cn() utility
**Effort**: 4h (setup + critical tests) | **Risk**: CRITICAL
**Acceptance**: vitest runs, coverage report generated, CI blocks on test failure

### [INFRASTRUCTURE] Add Lefthook Pre-commit Hooks
**File**: New: lefthook.yml
**Perspectives**: architecture-guardian, maintainability-maven
**Impact**: Broken code can reach main branch - no quality gates
**Fix**:
```yaml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: "*.{ts,tsx}"
      run: npm run lint
    typecheck:
      run: npx tsc --noEmit
```
**Effort**: 1h | **Risk**: HIGH
**Acceptance**: Commits blocked if lint/typecheck fails

### [SECURITY] Add Security Headers via next.config.ts
**File**: next.config.ts:1-7
**Perspectives**: security-sentinel
**Impact**: Missing CSP, X-Frame-Options enables clickjacking, future XSS
**Fix**: Add headers() function with CSP, X-Frame-Options: DENY, X-Content-Type-Options, Referrer-Policy, HSTS
**Effort**: 30m | **Risk**: HIGH
**Acceptance**: curl -I returns all security headers, securityheaders.com grade A

### [SECURITY] Update Next.js to 15.5.6+
**File**: package.json:15
**Perspectives**: security-sentinel
**Impact**: GHSA-4342-x723-ch2f (SSRF), GHSA-g5qg-72qw-gw5v (cache confusion), GHSA-xv57-4mr9-wg8v (content injection)
**Fix**: `npm update next@latest`
**Effort**: 15m + regression test | **Risk**: MODERATE
**Acceptance**: npm audit shows no Next.js vulnerabilities

### [DEAD CODE] Delete Unused Card Component
**File**: components/ui/card.tsx (79 lines)
**Perspectives**: grug, carmack, torvalds, jobs, ousterhout (5 agents - STRONG CONSENSUS)
**Impact**: Dead code adds maintenance burden, confuses developers
**Fix**: `rm components/ui/card.tsx`
**Effort**: 2m | **Risk**: LOW
**Acceptance**: Build passes, no import errors

### [DEAD CODE] Delete Unused Navbar Component
**File**: components/ui/navbar.tsx (20 lines)
**Perspectives**: carmack, torvalds
**Impact**: Component exists but never imported/used
**Fix**: `rm components/ui/navbar.tsx`
**Effort**: 2m | **Risk**: LOW
**Acceptance**: Build passes

### [PERFORMANCE] Fix setInterval Memory Leak
**File**: app/page.tsx:75-82
**Perspectives**: performance-pathfinder
**Impact**: Interval fires every 50ms indefinitely after animation completes - wasteful CPU/battery
**Fix**: Clear interval when `prev >= total` inside callback
**Effort**: 10m | **Risk**: LOW
**Acceptance**: Animation stops cleanly, no continuous re-renders

### [CLEANUP] Remove Unused Assets
**File**: public/*.png (2MB total)
**Perspectives**: performance-pathfinder
**Impact**: b3485a7e... (821KB) and df14989... (1.2MB) not referenced anywhere
**Fix**: `rm public/b3485a7e*.png public/df14989*.png`
**Effort**: 2m | **Risk**: LOW
**Acceptance**: Verify no broken images, -2MB deployment size

---

## Next (This Quarter, <3 months)

### [ARCHITECTURE] Extract page.tsx into Section Components
**File**: app/page.tsx:226-527 (302 lines)
**Perspectives**: complexity-archaeologist, architecture-guardian, fowler, ousterhout, jobs (5 agents)
**Why**: 527-line god object - 64% of entire codebase in one file
**Approach**: Extract to components/sections/: HeroSection, PressSection, HiddenCostsSection, TestimonialsSection, FAQSection, CTASection. Move data to lib/data/
**Effort**: 4h | **Impact**: Enables parallel development, testing, component reuse
**Result**: page.tsx becomes ~100-line composition of section components

### [SIMPLIFICATION] Simplify ChromeInstallButton
**File**: components/ui/chrome-install-button.tsx:25-34, 36-51
**Perspectives**: grug, carmack, torvalds, fowler (4 agents)
**Why**: DOM manipulation theater (createElement/appendChild/click/removeChild) when simple `<a>` tag works. Three separate config objects when CVA pattern already exists in button.tsx
**Approach**: Replace with plain `<a>` tag with href, target="_blank", rel="noopener noreferrer". Use CVA for variants like button.tsx
**Effort**: 45m | **Impact**: -40 lines, clearer intent, no DOM manipulation

### [DESIGN] Replace Geist Font (Generic AI Aesthetic)
**File**: app/layout.tsx:2, 5, 10
**Perspectives**: design-systems-architect, jobs
**Why**: Geist = Vercel's house font, extremely common in Next.js templates. Screams "generic developer aesthetic"
**Approach**: Switch to Space Grotesk (distinctive, fintech-appropriate) or system fonts (zero network request)
**Effort**: 1h | **Impact**: Immediate brand differentiation

### [DESIGN] Migrate to Tailwind v4 @theme + OKLCH Colors
**File**: tailwind.config.ts, app/globals.css
**Perspectives**: design-systems-architect
**Why**: Using Tailwind v3 config pattern in v4 project. Hardcoded gray-* classes (60+ instances) prevent dark mode, brand-tinting
**Approach**: Define @theme in globals.css with OKLCH brand-tinted neutrals, semantic tokens (--color-surface, --color-foreground, etc.)
**Effort**: 3h | **Impact**: Dark mode ready, themeable, modern Tailwind patterns

### [INFRASTRUCTURE] Canary error tracking and health checks
**File**: `js/canary.js`, `api/health.js`, `api/canary/api/v1/errors.js`
**Perspectives**: architecture-guardian
**Why**: Production errors and uptime should be visible through Canary, without adding a framework or package manager.
**Status**: Implemented on Cloudflare Workers (`worker.mjs`) and the DigitalOcean sidecar (`server.js`) from the same handlers. Keep the service-bound `CANARY_API_KEY` server-only.

### [INFRASTRUCTURE] Add platform rate limiting for Canary relay
**File**: DigitalOcean app settings or edge/firewall config
**Perspectives**: security-sentinel, observability-advocate
**Why**: The in-process relay limiter is useful as a local guardrail but is not durable production abuse control for unauthenticated browser telemetry.
**Approach**: Configure an edge rate limit for `/api/canary/api/v1/errors`; keep browser-origin telemetry unauthenticated but bounded before it reaches the sidecar. The local guard keys first on DigitalOcean App Platform's `do-connecting-ip` header, so any future ingress change must preserve or deliberately replace that trust boundary.
**Effort**: 1h | **Impact**: Prevents relay spam from burning Canary ingest capacity.

### [ACCESSIBILITY] Add ARIA Attributes to Interactive Elements
**File**: app/page.tsx:90-110, 208-218
**Perspectives**: user-experience-advocate
**Why**: Toggle buttons lack aria-pressed, carousel indicators lack aria-label, no pause control for auto-rotating content (WCAG 2.2.2 violation)
**Approach**: Add aria-pressed to toggle buttons, aria-label to carousel, pause/play control
**Effort**: 2h | **Impact**: WCAG AA compliance, keyboard navigation

### [MAINTAINABILITY] Extract Magic Numbers as Constants
**File**: app/page.tsx:75, 161
**Perspectives**: maintainability-maven, fowler, beck
**Why**: 50ms, 3500ms, /20 animation timing scattered with no explanation
**Approach**: Create ANIMATION_CONFIG object with documented values
**Effort**: 30m | **Impact**: Self-documenting code, easy to tune animations

### [REFACTOR] Extract Duplicated Patterns
**File**: app/page.tsx:372-419 (testimonials), 431-477 (FAQ), 298-322 (press links)
**Perspectives**: fowler, beck
**Why**: 6 identical testimonial cards, 4 identical FAQ cards, 3 identical press links - same structure repeated
**Approach**: Extract TestimonialCard, FAQItem, PressLink components + data arrays
**Effort**: 2h | **Impact**: DRY principle, easier to add/modify items

---

## Soon (Exploring, 3-6 months)

- **[PRODUCT] Email Capture / Lead Generation** - Exit intent popup, newsletter footer. Currently 98% of traffic leaves with no capture. ConvertKit/Buttondown integration (product-visionary)
- **[PRODUCT] Analytics Tracking** - Add portable analytics. Can't measure conversion, traffic sources, or A/B test without data (product-visionary, architecture-guardian)
- **[INFRASTRUCTURE] Structured Logging (Pino)** - Replace console.log, add correlation IDs, log levels (architecture-guardian)
- **[PRODUCT] Social Proof Enhancement** - Real-time install counter, recent user activity feed (product-visionary, user-experience-advocate)
- **[DESIGN] Dark Mode Implementation** - Leverage @theme foundation once migrated (design-systems-architect)
- **[ACCESSIBILITY] Reduced Motion Support** - Respect prefers-reduced-motion for animations (user-experience-advocate)
- **[INFRASTRUCTURE] Changelog Automation** - Changesets or semantic-release (architecture-guardian)

---

## Later (Someday/Maybe, 6+ months)

- **[PRODUCT] Premium Tier / Monetization** - Savings dashboard, advanced analytics ($5/mo freemium)
- **[PLATFORM] Multi-Browser Support** - Firefox, Safari, Edge extensions (+60% TAM)
- **[PLATFORM] Mobile PWA** - Barcode scanner, calculator mode (60% of e-commerce is mobile)
- **[PRODUCT] AI Spending Coach** - Pattern analysis, smart notifications (differentiation play)
- **[PRODUCT] Interactive Demo Calculator** - Let users type price, see time conversion before install

---

## Learnings

**From 2025-12-01 grooming session (15-agent analysis):**
- **Strong consensus (5+ agents)**: Zero test coverage and 527-line page.tsx god object are the primary technical debt. Card component is dead code - delete it.
- **Persona alignment**: Grug + Carmack + Jobs + Torvalds all say "delete unused abstractions, simplify ChromeInstallButton" - strong signal.
- **Security gap**: Missing CSP headers + outdated Next.js (known SSRF vulnerability) are real risks, not theoretical.
- **Design discovery**: Geist font = generic AI aesthetic. Space Grotesk or system fonts would differentiate brand.
- **Product insight**: Landing page has zero lead capture - 98% of traffic wasted. Analytics + email capture high ROI.

**Key metrics discovered:**
- Codebase: 825 LOC across 8 files
- Largest file: page.tsx at 527 LOC (64% of codebase)
- Test coverage: 0%
- Dead code: ~100 lines (Card, Navbar, unused assets)
- Security headers: 0/6 critical headers present

---

## Quality Gates (Target State)

### Testing
- [ ] Unit tests: >80% coverage for lib/, components/
- [ ] E2E tests: Critical paths (page load, CTA clicks)
- [ ] Visual regression: Screenshot comparison on PRs

### Code Quality
- [ ] Pre-commit hooks: lint + typecheck blocking
- [ ] TypeScript strict mode: Zero `any` types
- [ ] ESLint: Zero violations

### Security
- [ ] CSP + security headers: A+ rating
- [ ] Dependencies: Zero known vulnerabilities
- [ ] Next.js: Current stable version

### Performance
- [ ] Lighthouse: >90 all categories
- [ ] Bundle size: Monitor for >10% increases
- [ ] Page load: <2s on 3G

---

*Next groom: After Phase 1 (Now items) complete*
