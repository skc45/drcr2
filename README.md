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
