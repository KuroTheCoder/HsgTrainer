# Backup guide — your practice data is local

All practice sessions, mistakes, and progress live in your **browser** (IndexedDB).
There is no server-side account — nothing is synced automatically, so a backup is
your only safety net.

## One-time setup (2 minutes)

1. Open **Settings → Data**.
2. Click **Export backup** → a file like `hsgtrainer-backup-2026-08-17.json` downloads.
3. Drop that file into any folder that syncs for free: Google Drive, iCloud Drive,
   OneDrive, Dropbox, or a USB stick. The OS copies it to the cloud for you.
4. Done. Re-export every few weeks (or after an exam session you want to keep).

## Restoring (after a browser cleanup / new device)

1. Open **Settings → Data** on the new device.
2. Click **Import backup** and pick the `.json` file.
3. Sessions, mistakes, and progress come back. Note: **import replaces** whatever
   local data the browser already has.

## What is NOT in the backup

- Writing history (AI-scored essays) — stored server-side, follows you anywhere.
- Question banks, papers, appearance/sound preferences — they don't need backing up.

## More about the local-first design

Why local-first? Grinding costs nothing: every answer is scored in the browser, so
the free Cloudflare quota is never touched by practice. The server only serves
question banks, AI writing feedback, reports, and admin. See `docs/product-notes.md` §7.
