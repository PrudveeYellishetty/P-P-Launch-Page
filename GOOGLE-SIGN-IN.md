# Google sign-in setup

The frontend uses Google OAuth through Supabase with PKCE and remembered sessions. Google credentials belong in Supabase, never in frontend files or GitHub.

## 1. Google Cloud

Create/select a project at https://console.cloud.google.com/ and open Google Auth Platform.

- Set the app name to `p & p` and choose your support email.
- Choose an External audience. While in Testing, add both people's Google addresses as test users.
- Request only `openid`, email and profile scopes.
- Create an OAuth client with application type **Web application**.
- Authorized JavaScript origin: `https://p-p-launch-page.yprudveekumar946.workers.dev`
- Authorized redirect URI: `https://fabxnzlzfznthcuilxdj.supabase.co/auth/v1/callback`

Save the Client ID and Client Secret privately.

## 2. Supabase provider settings

In Authentication → Sign In / Providers → Google, enable Google and enter the Client ID and Client Secret. Keep nonce checks enabled.

In Authentication → URL Configuration set both Site URL and an allowed redirect URL to:

`https://p-p-launch-page.yprudveekumar946.workers.dev/`

Once the migration is complete, disable anonymous sign-ins. Do not delete anonymous users yet; keep them until the migrated workspace has been checked.

## 3. Database migration

Run `supabase-google-migration.sql` after the original `supabase-setup.sql`, then populate `pp_private.google_allowlist` as the project owner. The task also supplies a local, private combined SQL file containing the two approved addresses, so the owner can run that single file instead. Never commit the private file.

The migration preserves one existing workspace or creates one if none exists. If several exist, it fails rather than choosing or deleting data. Inspect those workspaces before choosing one. The first allowed Google sign-in replaces that person's anonymous membership without moving their content. Later browsers use the same Google account ID and reconnect automatically.

Only the two allowlisted Google identities can become workspace members. Email addresses are not in the frontend. Old pairing endpoints are revoked. Do not rerun the legacy setup script alone after this migration, because it restores legacy grants; if needed, rerun the Google migration immediately afterward.

## 4. Verify

1. Export the current workspace as a backup before migrating.
2. Open the production site and click **Continue with Google**.
3. Sign in with the first approved account; confirm existing notes and messages remain.
4. Open another browser with the same Google account; confirm it loads the same workspace without pairing.
5. Sign in as the second person and exchange messages. The selected task tab does not change message authorship.
6. Check an uninvited account is denied access.
7. Sign out locally and verify that this browser's shared cache is cleared. Pending unsent changes block sign-out until synced or backed up; export alone does not discard the queue.

The GATE preparation countdown targets **1 February 2027**, measured at midnight in Asia/Kolkata. This is a personal preparation deadline, not an official exam-date claim.

Live Google OAuth cannot complete until the provider configuration and allowlist are installed.
