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
- `VITE_PUBLIC_SITE_URL` (static build fallback only; runtime URLs use the active origin)
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

The R2 bucket must allow CORS PUT requests from both public site origins with
the `Content-Type` request header:

- `https://digitalcardmaiya.com`
- `https://rsvpbymaiya.saisyah-zainal.workers.dev`

## Custom domain checklist

1. In Cloudflare Workers & Pages, add `digitalcardmaiya.com` as a Custom Domain
   for the `rsvpbymaiya` Worker.
2. Keep the existing `workers.dev` route enabled for the demo URL.
3. Confirm Cloudflare creates the required proxied DNS record and issues an
   active Universal SSL certificate.
4. Do not add an application redirect between the two hosts. Each host should
   serve and generate links for its own origin.
5. Add both origins to the R2 CORS allowlist for authenticated browser uploads.
6. In Supabase Auth URL configuration, allow both origins if any future auth
   flow uses redirects. Password login itself does not construct a domain URL.
7. Verify on both hosts:
   - `/`, `/login`, `/dashboard`, and `/invitations`
   - `/invite/:slug`, RSVP submission, video, cover image, BM/EN switching
   - `/report/:slug` and the private PIN flow
   - Copy Invitation Link, Copy Dashboard Link, WhatsApp sharing
   - raw page-source canonical/Open Graph/Twitter URLs
   - mobile and desktop layouts
8. Refresh WhatsApp/Facebook previews with a temporary query such as
   `/invite/:slug?v=custom-domain-test`; do not change the stored slug.
