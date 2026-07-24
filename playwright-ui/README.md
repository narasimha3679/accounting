# Playwright UI tests

UI end-to-end tests for the accounting frontend.

## Scope

- Covers company accounting, payroll/HR, reports, settings, employee portal, and public calculators.
- **Out of scope:** auth flows (login/signup/logout/password reset) and anything that sends email. Login is setup-only via `PLAYWRIGHT_TEST_*` credentials.
- Uses a single real company user. Enable **all features** for that company under Settings → Features before running.

## Setup

```bash
cd playwright-ui
npm install
npx playwright install chromium
cp .env.example .env   # then set credentials
```

Ensure the backend can start (`backend/.env` configured). Playwright starts Vite (port 3000) and the Express API (port 3001) automatically unless they are already running.

## Credentials

Set in `.env` (gitignored):

- `PLAYWRIGHT_TEST_EMAIL`
- `PLAYWRIGHT_TEST_PASSWORD`
- `PLAYWRIGHT_BASE_URL` (default `http://localhost:3000`)
- `PLAYWRIGHT_BACKEND_URL` (default `http://localhost:3001`)

## Conventions

- Prefix created data with `PW …` + timestamp (e.g. `PW Client 171000…`) and delete it in the test.
- Tests run **serially** (`workers: 1`) against one live company.
- Auth session is created once in `tests/auth.setup.ts` and reused via `.auth/user.json` (`storageState`).
- Prefer role/label selectors over CSS.

## Run

From repo root:

```bash
npm run test:ui
```

From `playwright-ui/`:

```bash
npm test                 # full suite
npm run test:cogs        # COGS + Gross Profit only
npm run test:headed      # visible browser
npm run test:ui          # Playwright UI mode
npm run report           # last HTML report
```

## Phases

| Phase | Specs |
|-------|--------|
| 0 Harness | `smoke.spec.ts`, `cogs.spec.ts`, `auth.setup.ts` |
| 1 Accounting | `clients`, `invoices`, `income`, `expenses`, `capital-assets`, `dividends`, `salary` (legacy `/salary` → pay runs), `owner-payments` |
| 2 Payroll/HR | `employees`, `time-management`, `pay-runs`, `payroll-reports`, `remittances`, `roe`, `t4` |
| 3 Rest | `reports`, `tax-summary`, `settings`, `employee-portal`, `public-tools` |
