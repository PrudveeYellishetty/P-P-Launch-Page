# Deploy on Cloudflare

This is plain JavaScript, not a Next.js project. Supabase provides the backend.

## Cloudflare Workers with static assets (recommended)

1. Open Workers & Pages in the Cloudflare dashboard and create an application.
2. Choose the Git repository import flow, connect GitHub, and authorize access to `PrudveeYellishetty/P-P-Launch-Page`.
3. Use these settings:

| Setting | Value |
| --- | --- |
| Repository branch | `main` |
| Project / Worker name | `p-p-launch-page` |
| Root directory | Repository root (leave blank) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

The checked-in `wrangler.jsonc` points to `dist/`. No server code, database password, Supabase secret key, or environment variables are required. The public browser connection details are already configured. Cloudflare may request GitHub authorization from the account owner.

If choosing **Pages** instead: select framework **None**, build command `npm run build`, output directory `dist`, and root directory blank. Pages does not need a deploy command.

## Configure Google sign-in on the production URL

Follow [GOOGLE-SIGN-IN.md](GOOGLE-SIGN-IN.md). Export the old local desktop before moving to the hosted page. After OAuth, the database migration and the private allowlist are configured, both people sign in with Google on the same production URL. Returning browsers reconnect automatically; no pairing code is needed.

Use the production URL as your browser startup page, not a preview URL. The OAuth callback returns to the configured production URL. Pushes to `main` redeploy through Cloudflare Git integration.

The code and migration are locally verified. Live Google consent/callback and live private uploads must be checked after provider setup.
