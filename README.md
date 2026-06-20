# 🤲 HandBridge — Remote Hand Tracking

Real-time hand tracking between **any two devices, anywhere in the world** — different cities, different networks (Jio 4G ↔ home WiFi, etc.). No same-network requirement.

## Architecture

```
Device A (Mobile/Jio 4G)          Cloud Server (Render / Railway)           Device B (Laptop/WiFi)
        │                                      │                                      │
        │──── Socket.IO (HTTPS/WSS) ──────────►│◄────── Socket.IO (HTTPS/WSS) ────────│
        │                                      │                                      │
        │      WebRTC Offer/Answer/ICE relayed through server                         │
        │                                                                             │
        │◄──────────────── WebRTC Peer-to-Peer video stream ─────────────────────────►│
        │                                                                             │
        │   MediaPipe landmarks sent via Socket.IO for overlay on both sides          │
```

- **Signaling**: Socket.IO over HTTPS (works through any firewall/NAT)
- **Video**: WebRTC P2P (direct when possible, TURN relay when behind strict NAT)
- **Hand tracking**: MediaPipe Hands (runs in-browser, no server compute needed)
- **Pairing**: 6-character room codes

## Quick Deploy

### Option A: Render (Free tier)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your repo, Render auto-detects `render.yaml`
4. Click **Deploy** — done. You'll get a URL like `https://handbridge-signaling.onrender.com`

### Option B: Railway

1. Push to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select repo → Railway reads `railway.toml` automatically
4. Click **Deploy** → Get your `.up.railway.app` URL

### Option C: Local dev

```bash
npm install
npm start        # Listens on http://localhost:3000
# Or for live reload:
npm run dev
```

## Usage

1. Open the deployed URL on **Device A** (e.g. your laptop)
2. Click **🎲** to generate a room code, note it (e.g. `XK92AB`)
3. Open the **same URL** on **Device B** (e.g. your phone, different network)
4. Type the same room code and hit **Connect**
5. Both devices see each other's camera + hand landmark overlays in real time ✅

## Features

- ✅ Works across **any network** (Jio 4G, home WiFi, different cities)
- ✅ HTTPS/WSS everywhere — no mixed content issues
- ✅ WebRTC with STUN + TURN fallback for strict NATs
- ✅ MediaPipe hand landmark overlay on both local and remote feeds
- ✅ Gesture detection (✌️ Peace, ✊ Fist, 🖐️ Open Hand, 🤙 Shaka, etc.)
- ✅ Gesture log panel
- ✅ Mute mic toggle
- ✅ Enable/disable hand tracking overlay
- ✅ Clean leave / reconnect flow
- ✅ No login required — just a room code

## Environment Variables

| Variable | Default | Notes |
|----------|---------|-------|
| `PORT`   | `3000`  | Automatically set by Render/Railway |

## File Structure

```
handtrack-app/
├── server.js          # Express + Socket.IO signaling server
├── package.json
├── render.yaml        # Render deployment config
├── railway.toml       # Railway deployment config
└── public/
    └── index.html     # Full client app (camera, WebRTC, MediaPipe)
```

## Notes on TURN Servers

The app uses the free `openrelay.metered.ca` TURN server as fallback for devices behind strict NAT/firewalls. For production use at scale, consider a dedicated TURN server (Coturn on a VPS, or Metered.ca paid plan) for better reliability.
