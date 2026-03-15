# Caltex Fuel Price Scraper + React Dashboard

This project uses Playwright to scrape the Caltex Hong Kong fuel prices page and shows the result in a React app.

For production, it also includes a serverless endpoint that fetches and parses fuel prices on demand.

The scraper collects:

1. Gold with Techron price
2. Platinum with Techron price
3. Last updated time

## Commands

- `npm run scrape:fuel`
  Runs Playwright scraper and writes output to `public/fuel-prices.json`.

- `npm run dev`
  Starts Vite dev server.

- `npm run dev:with-scrape`
  Runs scraper first, then starts Vite dev server.

- `npm run build`
  Type-checks and builds production assets.

- `npm run dev:serverless`
  Runs local Vercel dev server (frontend + `/api/fuel-prices`).

## Scraper Output

The generated JSON file is at:

- `public/fuel-prices.json`

React reads this file on page load and renders the three target values.

## Serverless Endpoint

- Endpoint path: `/api/fuel-prices`
- File: `api/fuel-prices.js`

Response includes:

1. Gold with Techron price
2. Platinum with Techron price
3. Last updated time

The React app now tries this endpoint first on each refresh, then falls back to `public/fuel-prices.json` if needed.

## Deployment

To use the serverless endpoint, deploy to Vercel (GitHub Pages alone cannot run server-side functions).

1. Push this repository to GitHub.
2. Import the repo into Vercel.
3. Vercel will detect `vercel.json` and deploy both static app + API function.
