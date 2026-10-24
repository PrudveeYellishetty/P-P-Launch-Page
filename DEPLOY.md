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

## Use the permanent URL before pairing

1. Export your desktop from the local page via Customize → Export everything.
2. Open the permanent production URL. Browser storage from the local file does not transfer automatically.
3. Import the backup on the first browser, then create the shared workspace through Customize → Shared storage.
4. Generate a private pairing code. The other person opens the same production URL and joins using that code.
5. Test messages in both directions, a task update, and an uploaded image. Reload both browsers to confirm persistence.

Enable anonymous sign-ins in Supabase and run the current `supabase-setup.sql` before pairing. If you previously paired the local file, the hosted page has a different browser identity; do not assume it reconnects automatically. Keep the old page and backup until the hosted workspace is verified.

Use the production URL, not a deployment preview URL, as your browser startup page. Pushes to `main` will redeploy once Git integration is connected.

## Validation status

Local rendering and mock two-browser sync were tested. Live Supabase permissions, realtime delivery and private uploads still require end-to-end verification against the configured project. The SQL setup was reported successful by the project owner.
