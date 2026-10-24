# p & p

A frontend-only browser launch page for Prudvee and Priyadarshini, built from the approved Figma frame `5:14`.

## Run

Open `index.html` directly in Edge or Chrome. The included `app.bundle.js`, fonts and images work without a server or external requests. Direct-file browser storage was verified in Edge; keep the folder in the same location and export backups before moving it.

Alternatively, from this folder run `python -m http.server 4173 --bind 127.0.0.1`, then open http://127.0.0.1:4173/. Keep the address and port the same to retain the same browser storage. Localhost preview was unavailable in the development environment; the standalone-file path was tested instead.

This is a static website with an optional Supabase backend and a locally bundled Supabase JS 2.57.4 client. A server only serves files; it does not store messages. It can also be uploaded to any static host, then set as your browser startup URL. For source edits, run `node build.mjs` to rebuild the included bundle.

## Features

- Search or open web addresses.
- Independently draggable, editable, resizable paper notes; optional checklists. Notes snap back if dropped over fixed controls. Arrow keys move a focused note handle. Mobile uses a readable stacked layout.
- Separate task lists for each person; complete, restore, edit and delete tasks; persistent focus-session countdowns.
- GATE preparation countdown to 1 February 2027 using India time. This is a personal deadline, not an official exam date.
- Save video links, images, documents and written notes, with resource filters. Local uploads support PNG/JPEG/WebP/GIF, PDF and plain text up to 1 MB each, subject to the browser storage quota.
- App shortcuts; local message history; export/import messages as JSON files.
- Full workspace export/import, muted-background setting and reduced-motion support.

## Storage

The `pp-desktop-v1` localStorage entry contains the desktop and, when paired, its pending sync queue. The app stays local until Google sign-in and the shared workspace are configured. Export/import messages and full workspaces remain available. Full backup imports replace shared items when connected; exported backups exclude browser pairing state.

### Google sign-in and shared workspace

Follow [GOOGLE-SIGN-IN.md](GOOGLE-SIGN-IN.md) to configure Google OAuth, the Supabase redirect URLs, and the private allowlist. Run the original schema followed by the Google migration (existing installs need only the migration). Both approved Google accounts use one workspace, and each account works across browsers without pairing codes.

The private email allowlist lives only in the database. The public browser connection settings are in `supabase-config.js`. Existing anonymous memberships are replaced on the first approved Google login; existing workspace items are preserved. Google credentials stay in Supabase. The selected task tab does not affect message authorship. Signing out clears this browser's shared cache and is blocked while edits are pending sync. Use Customize → Shared storage to manage the connection.

Each item syncs separately. Local changes queue durably and retry when connectivity returns, with idempotent operation IDs. Realtime triggers refreshes; a 15-second fallback poll covers missed events. Simultaneous edits to the same item use the last committed write. Settings for appearance, selected profile and session timers remain local. Uploaded files go to the private `pp-files` bucket, with a local cache and 1 MB per-file limit. Removed pins retain their uploaded objects for now; unused objects can be cleaned up through the Storage dashboard. Browser quota still limits the local cache. Keep exports as backups.

## Verification

Tested in an isolated Edge browser at 1440×960, 1280×800 and 390×844. Sixteen checks passed: initial rendering, note creation and persistence, independent note dragging, sticky checklists, task creation/completion, focus session persistence, profile switching/message attribution, message export, resource filtering, local upload, shortcuts, editable countdown, full backup round trip, invalid backup rejection, responsive layout, and no runtime errors or failed assets. Two isolated Edge sessions also passed mock-service tests for workspace creation/join, code display, message delivery, offline queue persistence across reload, and retry. Live database execution, RLS isolation, Realtime and Storage integration remain pending the owner running SQL setup; mock tests do not validate those services.

## Design

Colors, geometry and static SVG assets originate from the approved Figma design. Fonts and assets are bundled locally. Initial notes, tasks, messages and resource cards are sample content you can replace. The noticeboard status reports local-only, pending sync, offline/setup-needed, or shared/up-to-date state.

Responsive update: the desktop now uses fluid CSS Grid rather than a scaled 1440px canvas. Verified full-width rendering at 1920×870, 1677×960, 1440×960, 1280×800, 1024×768, 768×1024 and 390×844, with no horizontal page overflow. Notes keep relative placements after dragging. Compact screens reflow instead of shrinking typography. Refresh an already-open tab after updating files.

Google-auth update verification: the SQL migration and RLS policies passed isolated PostgreSQL tests (including allowed/denied identities, legacy access revocation, existing-data preservation and message authorship). Mock browser tests passed returning-account access across browsers, message sync, sign-out/offline handling, countdown date boundaries and desktop/mobile rendering. Live Google consent and callback require the owner to configure the provider first.
