# 🎙 VoiceBridge

A peer-to-peer voice call application that mixes both participants' audio into a single output stream — perfect for routing into Discord, OBS, Zoom, or any application as a virtual microphone input.

## Features

- **P2P WebRTC** — direct browser-to-browser connection, no audio passes through the server
- **Mixed audio output** — both voices merged into one stream via Web Audio API
- **Live waveform visualizer** — see both channels rendered in real-time
- **VU meters** — per-person speaking activity indicators
- **Mute / Deafen controls**
- **Built-in Discord routing guide** — Windows, macOS, Linux

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Then open **http://localhost:3000** in your browser.

## How It Works

1. **Person A** clicks "Create New Room" → gets an 8-character room code
2. **Person B** enters the code and clicks "Join"
3. WebRTC negotiation happens via the signaling server (WebSocket)
4. Audio streams directly P2P — the server only passes SDP/ICE messages
5. The Web Audio API merges both mic streams into one destination node

## Routing to Discord (the key part)

The app mixes both voices in the browser. To pipe that into Discord:

### Windows — VB-Cable (free)
1. Install [VB-Audio Virtual Cable](https://vb-audio.com/Cable/)
2. In Chrome, click the 🔊 tab icon → Output: **CABLE Input (VB-Audio)**
3. In Discord: Settings → Voice & Video → Input: **CABLE Output (VB-Audio)**

### macOS — BlackHole (free)
1. Install [BlackHole 2ch](https://existential.audio/blackhole/)
2. In Audio MIDI Setup, create a **Multi-Output Device** (BlackHole + your speakers)
3. In Chrome, route tab audio to that Multi-Output Device
4. In Discord: Input → **BlackHole 2ch**

### Linux — PulseAudio
1. `pactl load-module module-null-sink sink_name=voicebridge`
2. In `pavucontrol` → Playback → set browser output to **VoiceBridge**
3. In Discord: Input → **Monitor of VoiceBridge**

## Architecture

```
Browser A (mic) ─┐                          ┌─ Browser B (mic)
                  └── WebSocket Signaling ──┘
                  └── WebRTC P2P Audio ─────┘
                  
Browser A Web Audio Graph:
  localMic → AnalyserNode ─┐
                             ├─ ChannelMerger → MediaStreamDestination
  remotePeer → AnalyserNode ─┘        ↓
                                  (route to virtual cable → Discord)
```

## Deployment

For two users on different networks, deploy to any Node.js host (Railway, Render, Fly.io, etc.).
HTTPS is required for microphone access when not on localhost.

```bash
# Set port via environment variable
PORT=8080 npm start
```

For production, add TURN server credentials to the `ICE_SERVERS` array in `public/index.html`
for users behind strict NAT/firewalls (free tier: [Metered.ca](https://www.metered.ca/tools/openrelay/)).
