# Cloudflare Worker deployment

This repository deploys one Cloudflare Worker that executes `/api/*` first and
serves the Vite build from `dist` for every other route. SPA fallback is
configured by `wrangler.jsonc`.

## GitHub-connected build settings

- Build command: `bun run build`
- Deploy command: `bunx wrangler deploy`
- Bun version: `1.2.15`
- Node version: `22.16.0`

## Frontend build variables

These values are compiled into the public browser bundle and must not contain
secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PUBLIC_SITE_URL`
- `CLOUDFLARE_R2_PUBLIC_DOMAIN` (used by the Vite build for public playback URLs)

## Worker runtime variables and secrets

Configure these as Worker runtime variables:

- `SUPABASE_URL`
- `CLOUDFLARE_R2_ACCOUNT_ID`
- `CLOUDFLARE_R2_PUBLIC_DOMAIN`

Configure these as encrypted Worker secrets:

- `SUPABASE_ANON_KEY`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`

The R2 access keys are required only to sign browser-to-R2 PUT requests. They
must never use a `VITE_` prefix. The `MEDIA_BUCKET` R2 binding is used for
server-side object deletion and targets `maiya-invitation-media`.

The R2 bucket must allow CORS PUT requests from the production site origin with
the `Content-Type` request header.
