# Hayle — Rich Presence (local companion)

Shows **"Playing Hayle — Helpful Assistant, Your Loyal Expert"** on your profile with an
"Add Hayle" button. Rich Presence talks to the Discord desktop app over local IPC, so this
**must run on your PC** — it can't run on Render or GitHub Actions.

## Setup (one time)
1. `cd presence`
2. `npm install`
3. Your parent `.env` already has `CLIENT_ID`. That's enough to start.

## Optional: large image
1. Discord Developer Portal → **Hayle** app → **Rich Presence** → **Art Assets** → upload an
   image, name it e.g. `hayle`.
2. Set `HAYLE_RP_IMAGE=hayle` in the parent `.env`.

## Run
1. Open the Discord desktop app (web Discord won't work).
2. `npm start`
3. Keep it running — close it and the presence clears.

Note: the button says "Add Hayle" and goes to your invite link. It links to `BOT_INVITE_URL`
if set, otherwise builds one from `CLIENT_ID`.
