# F1 Live 🏎️

Real-time Formula 1 data app powered by [OpenF1 API](https://openf1.org).

**Live at:** https://f1.fomo.com.ar

---

## Features

| Page | Description |
|------|-------------|
| `/live` | Live timing — positions, gaps, sectors, tyre data (SSE, updates every 3s) |
| `/analytics` | Session analysis — pace, teams, long stints, sectors, speed trap |
| `/strategy` | Interactive race strategy simulator with tyre degradation model |
| `/telemetry` | Multi-driver telemetry comparison — speed/throttle/brake |
| `/calendar` | Full season calendar with session times and countdowns |

---

## Pitwall Agent API

REST endpoints designed for AI agent consumption. All return clean JSON. CORS enabled.

| Endpoint | Description |
|----------|-------------|
| `GET /api/agent/live` | Real-time timing data (latest session) |
| `GET /api/agent/strategy?session_key=&driver=` | Strategy simulation for a driver |
| `GET /api/agent/analysis?session_key=` | Full session pace analysis |
| `GET /api/agent/calendar?year=` | Season calendar with countdowns |
| `GET /api/agent/telemetry?session_key=&driver=&lap=` | Lap telemetry data |
| `GET /api/docs` | Interactive API documentation |

### Example calls

```bash
# Live timing
curl https://f1.fomo.com.ar/api/agent/live

# Strategy for Verstappen (AUS 2025 Race)
curl "https://f1.fomo.com.ar/api/agent/strategy?session_key=9159&driver=VER"

# Session analysis
curl "https://f1.fomo.com.ar/api/agent/analysis?session_key=9159"

# Upcoming races
curl "https://f1.fomo.com.ar/api/agent/calendar?year=2025"

# Fastest lap telemetry
curl "https://f1.fomo.com.ar/api/agent/telemetry?session_key=9159&driver=LEC&lap=fastest"
```

---

## MCP Server (Claude / FAMA integration)

The `mcp-server.js` exposes F1 tools via [Model Context Protocol](https://modelcontextprotocol.io):

### Tools available

- **`f1_live_timing`** — Current session state and standings
- **`f1_strategy_analysis`** — Race strategy recommendations for a driver
- **`f1_session_analysis`** — Full pace and performance analysis
- **`f1_upcoming_sessions`** — Next races and sessions with countdowns

### Running the server

```bash
# Local (connects to localhost:3000)
node mcp-server.js

# Production
F1_API_BASE=https://f1.fomo.com.ar node mcp-server.js
```

### Connecting to OpenClaw (claude_desktop_config.json)

```json
{
  "mcpServers": {
    "f1-live": {
      "command": "node",
      "args": ["/path/to/f1-live/mcp-server.js"],
      "env": {
        "F1_API_BASE": "https://f1.fomo.com.ar"
      }
    }
  }
}
```

### Connecting to FOMO fomo-core Pitwall Agent

Add HTTP tool endpoints in the agent config:

```
GET https://f1.fomo.com.ar/api/agent/live
GET https://f1.fomo.com.ar/api/agent/strategy?driver={driver}
GET https://f1.fomo.com.ar/api/agent/analysis?session_key={session_key}
GET https://f1.fomo.com.ar/api/agent/calendar
```

---

## Stack

- **Next.js 15** — App Router, API Routes, SSE
- **TypeScript** — Full type coverage
- **Tailwind CSS** — Dark theme
- **Recharts** — Charts and telemetry visualization
- **OpenF1 API** — Real-time F1 data (free, no auth required)

## Local development

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Deploy

```bash
# Build
npm run build

# Start
npm start
```

Deployed on Dokploy at https://f1.fomo.com.ar

---

*Not affiliated with Formula 1 or FIA. Data provided by OpenF1.*
