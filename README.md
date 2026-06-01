# PeopleZuup

A small, lively people network for Zuup.

It ships as a TanStack Start app with SSR, Supabase-backed data, and a Cloudflare-first deployment setup.

## What this is good at

- Showing a connected people graph with profile cards
- Keeping admin-only edits behind a server-side Supabase check
- Running cleanly on Cloudflare Workers with static assets

## Quick start

```bash
npm install
npm run dev
```

Open the local URL Vite prints in the terminal.

## Deploy to Cloudflare

This repo is wired for **Cloudflare Workers** rather than Pages, because the app uses SSR and server routes.

```bash
npm run build
npm run deploy:cloudflare
```

The Cloudflare config lives in [wrangler.toml](wrangler.toml).

## GitHub to Cloudflare

If you want the GitHub button path:

1. Connect this repository to Cloudflare Workers.
2. Use `npm run build` as the build command.
3. Deploy the Worker using the included Wrangler config.
4. Publish the `dist/client` assets together with `dist/server/server.js`.

## Project notes

- Worker entry: `dist/server/server.js`
- Static assets directory: `dist/client`
- Runtime compatibility: `nodejs_compat`
- Admin access is controlled in [src/routes/admin.tsx](src/routes/admin.tsx)

## A tiny reminder

The app is intentionally a bit opinionated: it wants to feel like a friendly little directory, not a spreadsheet wearing sunglasses.
# zuup-people
