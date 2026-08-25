# DRCR2 Messaging App

A messaging platform with **8 separate posting methods**, each with its own behavior and UI.

It runs as a **website** and as a **native Android app**. On Android, posts live on the device — no server required.

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

## Android app

The Android build is a Capacitor wrapper around the same React UI (`com.skc45.drcr2`). Navigation uses a drawer, and the posting API is stored in on-device `localStorage`.

**Direct APK download:** [releases/DRCR2-debug.apk](https://github.com/skc45/drcr2/raw/cursor/android-app-0ace/releases/DRCR2-debug.apk)

### Build a debug APK

Requires JDK 21 and the Android SDK (or Android Studio).

```bash
npm run install:all
npm run android:apk
```

The APK is written to:

`client/android/app/build/outputs/apk/debug/app-debug.apk`

Install it on a phone or emulator:

```bash
adb install -r client/android/app/build/outputs/apk/debug/app-debug.apk
```

### Open in Android Studio

```bash
npm run install:all
npm run android:sync
npm run android:open
```

Then click **Run** on an emulator or a USB-debuggable device.

CI also builds the debug APK on every push (see `.github/workflows/android.yml`).

To preview the Android layout in a browser (on-device store, no Node API):

```bash
npm install --prefix client
npm run dev:local --prefix client
```

Then open http://localhost:5173 and shrink the window, or use device mode in DevTools.

Optional: point the app at a hosted API instead of local storage by setting `VITE_API_URL` (for example `https://your-server.example`) at build time.

## Quick Start (web)

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
- Capacitor 7 (Android)

## Deploy the web app to the Internet

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
