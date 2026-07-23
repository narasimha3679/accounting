# Playwright UI tests

UI end-to-end tests for the accounting frontend (COGS + Gross Profit and future coverage).

## Setup

```bash
cd playwright-ui
npm install
npx playwright install chromium
cp .env.example .env   # then set credentials
```

## Run

From `playwright-ui/` (starts Vite on port 3000 if it is not already running):

```bash
npm test                 # all UI tests
npm run test:cogs        # COGS + Gross Profit only
npm run test:headed      # visible browser
npm run test:ui          # Playwright UI mode
```

## Credentials

Set in `.env` (gitignored):

- `PLAYWRIGHT_TEST_EMAIL`
- `PLAYWRIGHT_TEST_PASSWORD`
- `PLAYWRIGHT_BASE_URL` (default `http://localhost:3000`)
