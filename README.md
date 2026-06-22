# DRCR2 Messaging App

A messaging platform with **8 separate posting methods**, each with its own behavior and UI.

## Posting Methods

| Method | Purpose |
|--------|---------|
| **Trash** | Ephemeral posts with auto-expiry; deleted content lands here |
| **Board** | Classic threaded discussions organized by board |
| **Catalog** | Visual grid overview of threads |
| **Feed** | Live timeline of recent activity |
| **Mail** | Private direct messages between users |
| **Article** | Long-form posts with titles |
| **Overboard** | Aggregated recent posts from all boards |
| **Hall of Fame** | Featured and highly upvoted posts |

## Quick Start

```bash
npm run install:all
npm run dev
```

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3001

Set your display name in the sidebar. Posts are stored in `server/data.json`.

## Stack

- React + Vite (client)
- Express + JSON file store (server)

## Deploy to the Internet

### Option A — Render (permanent, free)

1. Push is already on GitHub: [github.com/skc45/drcr2](https://github.com/skc45/drcr2)
2. Open [Render one-click deploy](https://render.com/deploy?repo=https://github.com/skc45/drcr2)
3. Sign in with GitHub and click **Apply** — Render reads `render.yaml` and deploys automatically.

Your app will get a URL like `https://drcr2.onrender.com`.

### Option B — Docker

```bash
docker build -t drcr2 .
docker run -p 3001:3001 drcr2
```

### Option C — Local tunnel (temporary)

While the server runs locally:

```bash
npm run build
npm start
npx localtunnel --port 3001
```

Note: free Render instances spin down after inactivity; the first request may take ~30s to wake up. Post data on Render uses ephemeral disk and resets on redeploy.
