import { NextResponse } from 'next/server';

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>F1 Live — Pitwall Agent API Docs</title>
<style>
  :root { --bg: #0a0e1a; --card: #1a1f2e; --border: #2a3040; --red: #e10600; --text: #e5e7eb; --muted: #6b7280; --green: #4ade80; --blue: #60a5fa; --yellow: #facc15; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; line-height: 1.6; }
  .container { max-width: 960px; margin: 0 auto; padding: 2rem 1rem; }
  .logo { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
  .logo-f1 { color: var(--red); font-size: 1.8rem; font-weight: 900; }
  .logo-live { color: white; font-size: 1.8rem; font-weight: 700; }
  .badge { background: var(--red); color: white; font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 9999px; font-weight: 700; }
  .subtitle { color: var(--muted); margin-bottom: 2rem; }
  .section { margin-bottom: 2.5rem; }
  h2 { color: white; font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
  h3 { color: var(--blue); font-size: 1rem; font-weight: 600; margin: 1.5rem 0 0.5rem; }
  .endpoint { background: var(--card); border: 1px solid var(--border); border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1rem; }
  .method-get { background: var(--green); color: #000; font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 4px; font-family: monospace; }
  .url { color: var(--yellow); font-family: monospace; font-size: 0.95rem; margin-left: 0.5rem; }
  .desc { color: var(--muted); font-size: 0.875rem; margin: 0.5rem 0; }
  .params { margin: 0.75rem 0; }
  .param { display: flex; gap: 0.5rem; align-items: baseline; margin-bottom: 0.25rem; font-size: 0.85rem; }
  .param-name { color: var(--blue); font-family: monospace; font-weight: 600; min-width: 140px; }
  .param-opt { color: var(--muted); font-size: 0.75rem; }
  .param-desc { color: #9ca3af; }
  pre { background: #0d1120; border: 1px solid var(--border); border-radius: 0.5rem; padding: 1rem; overflow-x: auto; font-size: 0.8rem; line-height: 1.5; margin-top: 0.75rem; }
  code { font-family: 'Courier New', monospace; color: var(--text); }
  .key { color: #93c5fd; }
  .str { color: #86efac; }
  .num { color: #fde68a; }
  .bool { color: #f9a8d4; }
  .try-link { display: inline-block; margin-top: 0.5rem; color: var(--red); font-size: 0.8rem; text-decoration: none; }
  .try-link:hover { text-decoration: underline; }
  .alert { background: #1e1b4b; border: 1px solid #4338ca; border-radius: 0.5rem; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.875rem; color: #a5b4fc; }
  .mcp-box { background: #0d1120; border: 1px solid var(--border); border-radius: 0.75rem; padding: 1.25rem; }
  .nav { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 2rem; }
  .nav a { color: var(--muted); font-size: 0.85rem; text-decoration: none; padding: 0.25rem 0.75rem; border: 1px solid var(--border); border-radius: 9999px; transition: all 0.15s; }
  .nav a:hover { color: white; border-color: var(--red); }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th { text-align: left; padding: 0.5rem 0.75rem; background: #0d1120; color: var(--muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); }
  td { padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border)/40; color: #9ca3af; vertical-align: top; }
  td:first-child { color: var(--yellow); font-family: monospace; }
</style>
</head>
<body>
<div class="container">
  <div class="logo">
    <span class="logo-f1">F1</span>
    <span class="logo-live">Live</span>
    <span class="badge">Pitwall Agent API</span>
  </div>
  <p class="subtitle">REST endpoints for AI agents · Powered by OpenF1 · Built for FOMO Pitwall Agent</p>

  <div class="nav">
    <a href="#live">Live Timing</a>
    <a href="#strategy">Strategy</a>
    <a href="#analysis">Analysis</a>
    <a href="#calendar">Calendar</a>
    <a href="#telemetry">Telemetry</a>
    <a href="#mcp">MCP Server</a>
  </div>

  <div class="alert">
    🤖 These endpoints are designed for AI agent consumption. All responses are JSON with clean, structured data ready for LLM processing. CORS enabled on all routes.
  </div>

  <!-- LIVE -->
  <div class="section" id="live">
    <h2>🔴 Live Timing</h2>
    <div class="endpoint">
      <div><span class="method-get">GET</span><span class="url">/api/agent/live</span></div>
      <p class="desc">Current session timing — positions, gaps, sectors, tyre data for all drivers. Auto-fetches latest active session.</p>
      <p class="desc"><strong style="color:white">No parameters required.</strong> Returns latest OpenF1 session automatically.</p>
      <pre><code>{
  <span class="key">"session"</span>: {
    <span class="key">"key"</span>: <span class="num">11228</span>,
    <span class="key">"name"</span>: <span class="str">"Race"</span>,
    <span class="key">"type"</span>: <span class="str">"Race"</span>,
    <span class="key">"status"</span>: <span class="str">"green"</span>,
    <span class="key">"circuit"</span>: <span class="str">"Albert Park"</span>,
    <span class="key">"country"</span>: <span class="str">"Australia"</span>,
    <span class="key">"year"</span>: <span class="num">2026</span>,
    <span class="key">"remaining"</span>: <span class="str">"00:45:12"</span>
  },
  <span class="key">"drivers"</span>: [
    {
      <span class="key">"pos"</span>: <span class="num">1</span>,
      <span class="key">"driver"</span>: <span class="str">"PIA"</span>,
      <span class="key">"full_name"</span>: <span class="str">"Oscar Piastri"</span>,
      <span class="key">"team"</span>: <span class="str">"McLaren"</span>,
      <span class="key">"gap"</span>: <span class="str">"leader"</span>,
      <span class="key">"interval"</span>: <span class="str">"--"</span>,
      <span class="key">"best_lap"</span>: <span class="str">"1:19.729"</span>,
      <span class="key">"last_lap"</span>: <span class="str">"1:20.011"</span>,
      <span class="key">"tyre"</span>: <span class="str">"soft"</span>,
      <span class="key">"tyre_age"</span>: <span class="num">14</span>,
      <span class="key">"laps"</span>: <span class="num">27</span>,
      <span class="key">"s1"</span>: <span class="str">"28.114"</span>,
      <span class="key">"s2"</span>: <span class="str">"19.832"</span>,
      <span class="key">"s3"</span>: <span class="str">"31.783"</span>
    }
  ]
}</code></pre>
      <a class="try-link" href="/api/agent/live" target="_blank">→ Try it live</a>
    </div>
  </div>

  <!-- STRATEGY -->
  <div class="section" id="strategy">
    <h2>🧠 Race Strategy</h2>
    <div class="endpoint">
      <div><span class="method-get">GET</span><span class="url">/api/agent/strategy</span></div>
      <p class="desc">Simulates 6 race strategies for a driver using real lap data + degradation model. Returns ranked recommendations with time deltas.</p>
      <div class="params">
        <table>
          <tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr>
          <tr><td>session_key</td><td>number</td><td>latest</td><td>OpenF1 session key</td></tr>
          <tr><td>driver</td><td>string</td><td>P1 driver</td><td>Driver acronym (PIA, VER, LEC…) or number</td></tr>
        </table>
      </div>
      <pre><code>{
  <span class="key">"driver"</span>: <span class="str">"PIA"</span>,
  <span class="key">"team"</span>: <span class="str">"McLaren Racing"</span>,
  <span class="key">"race_params"</span>: {
    <span class="key">"total_laps"</span>: <span class="num">58</span>,
    <span class="key">"pit_loss_seconds"</span>: <span class="num">22</span>,
    <span class="key">"best_lap_time"</span>: <span class="str">"1:19.729"</span>
  },
  <span class="key">"recommended_strategies"</span>: [
    {
      <span class="key">"rank"</span>: <span class="num">1</span>,
      <span class="key">"stops"</span>: <span class="num">2</span>,
      <span class="key">"label"</span>: <span class="str">"2-stop S→M→H"</span>,
      <span class="key">"compounds"</span>: [<span class="str">"soft"</span>, <span class="str">"medium"</span>, <span class="str">"hard"</span>],
      <span class="key">"estimated_race_time"</span>: <span class="str">"1:27:34.211"</span>,
      <span class="key">"delta"</span>: <span class="str">"+0.000"</span>,
      <span class="key">"delta_seconds"</span>: <span class="num">0</span>
    }
  ],
  <span class="key">"optimal_strategy"</span>: { <span class="str">"..."</span> }
}</code></pre>
      <a class="try-link" href="/api/agent/strategy?session_key=9159&driver=VER" target="_blank">→ Try: VER strategy AUS 2025</a>
    </div>
  </div>

  <!-- ANALYSIS -->
  <div class="section" id="analysis">
    <h2>📊 Session Analysis</h2>
    <div class="endpoint">
      <div><span class="method-get">GET</span><span class="url">/api/agent/analysis</span></div>
      <p class="desc">Full session analysis: pace ranking, team comparison, long-run pace, best sectors, speed trap, and AI-style key insights.</p>
      <div class="params">
        <table>
          <tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr>
          <tr><td>session_key</td><td>number</td><td>latest</td><td>OpenF1 session key</td></tr>
        </table>
      </div>
      <pre><code>{
  <span class="key">"session"</span>: <span class="str">"FP1 — Australia 2026"</span>,
  <span class="key">"pace_ranking"</span>: [
    {
      <span class="key">"pos"</span>: <span class="num">1</span>,
      <span class="key">"driver"</span>: <span class="str">"LEC"</span>,
      <span class="key">"team"</span>: <span class="str">"Ferrari"</span>,
      <span class="key">"best_lap"</span>: <span class="str">"1:20.267"</span>,
      <span class="key">"gap_to_leader"</span>: <span class="num">0</span>,
      <span class="key">"laps_completed"</span>: <span class="num">22</span>
    }
  ],
  <span class="key">"team_pace"</span>: [{ <span class="key">"pos"</span>: <span class="num">1</span>, <span class="key">"team"</span>: <span class="str">"Ferrari"</span>, <span class="key">"best_lap"</span>: <span class="str">"1:20.267"</span> }],
  <span class="key">"long_run_pace"</span>: [{ <span class="key">"driver"</span>: <span class="str">"NOR"</span>, <span class="key">"compound"</span>: <span class="str">"medium"</span>, <span class="key">"laps"</span>: <span class="num">12</span>, <span class="key">"avg_lap"</span>: <span class="str">"1:22.1"</span>, <span class="key">"deg_per_lap"</span>: <span class="str">"+0.08s/lap"</span> }],
  <span class="key">"key_insights"</span>: [
    <span class="str">"Ferrari showed strongest single-lap pace in FP1"</span>,
    <span class="str">"McLaren led FP2 with Piastri P1"</span>
  ]
}</code></pre>
      <a class="try-link" href="/api/agent/analysis?session_key=9159" target="_blank">→ Try: AUS 2025 Race analysis</a>
    </div>
  </div>

  <!-- CALENDAR -->
  <div class="section" id="calendar">
    <h2>🗓️ Calendar</h2>
    <div class="endpoint">
      <div><span class="method-get">GET</span><span class="url">/api/agent/calendar</span></div>
      <p class="desc">Full season calendar with upcoming sessions, countdowns, and race times in UTC and UTC-3 (Buenos Aires).</p>
      <div class="params">
        <table>
          <tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr>
          <tr><td>year</td><td>number</td><td>current year</td><td>Season year</td></tr>
          <tr><td>upcoming</td><td>boolean</td><td>true</td><td>false = return full calendar</td></tr>
        </table>
      </div>
      <pre><code>{
  <span class="key">"next_session"</span>: {
    <span class="key">"name"</span>: <span class="str">"Race"</span>,
    <span class="key">"country"</span>: <span class="str">"Bahrain"</span>,
    <span class="key">"date"</span>: <span class="str">"2026-03-15T15:00:00+00:00"</span>,
    <span class="key">"countdown"</span>: <span class="str">"8d 14h"</span>
  },
  <span class="key">"upcoming_sessions"</span>: [{ <span class="str">"..."</span> }],
  <span class="key">"upcoming_races"</span>: [
    {
      <span class="key">"name"</span>: <span class="str">"Bahrain Grand Prix"</span>,
      <span class="key">"circuit"</span>: <span class="str">"Bahrain International Circuit"</span>,
      <span class="key">"race_date"</span>: <span class="str">"2026-03-15T15:00:00+00:00"</span>,
      <span class="key">"race_date_ar"</span>: <span class="str">"2026-03-15 12:00 ART"</span>,
      <span class="key">"countdown"</span>: <span class="str">"8d 14h"</span>
    }
  ]
}</code></pre>
      <a class="try-link" href="/api/agent/calendar?year=2025" target="_blank">→ Try: 2025 calendar</a>
    </div>
  </div>

  <!-- TELEMETRY -->
  <div class="section" id="telemetry">
    <h2>📡 Telemetry</h2>
    <div class="endpoint">
      <div><span class="method-get">GET</span><span class="url">/api/agent/telemetry</span></div>
      <p class="desc">Raw telemetry for a specific lap: speed, throttle, brake, gear, DRS, RPM. Use lap=fastest for best lap.</p>
      <div class="params">
        <table>
          <tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr>
          <tr><td>session_key</td><td>number</td><td>latest</td><td>OpenF1 session key</td></tr>
          <tr><td>driver</td><td>string</td><td>first driver</td><td>Driver acronym or number</td></tr>
          <tr><td>lap</td><td>number|"fastest"</td><td>fastest</td><td>Lap number or "fastest"</td></tr>
        </table>
      </div>
      <pre><code>{
  <span class="key">"driver"</span>: <span class="str">"LEC"</span>,
  <span class="key">"lap"</span>: { <span class="key">"number"</span>: <span class="num">42</span>, <span class="key">"duration_formatted"</span>: <span class="str">"1:20.267"</span>, <span class="key">"is_fastest"</span>: <span class="bool">true</span> },
  <span class="key">"summary"</span>: { <span class="key">"max_speed_kmh"</span>: <span class="num">327</span>, <span class="key">"avg_throttle_pct"</span>: <span class="num">68.4</span> },
  <span class="key">"telemetry"</span>: [
    { <span class="key">"t"</span>: <span class="num">0</span>, <span class="key">"distance_km"</span>: <span class="num">0</span>, <span class="key">"speed"</span>: <span class="num">180</span>, <span class="key">"throttle"</span>: <span class="num">100</span>, <span class="key">"brake"</span>: <span class="num">0</span>, <span class="key">"gear"</span>: <span class="num">6</span> },
    <span class="str">"... up to 300 data points per lap"</span>
  ]
}</code></pre>
      <a class="try-link" href="/api/agent/telemetry?session_key=9159&driver=VER&lap=fastest" target="_blank">→ Try: VER fastest lap AUS 2025</a>
    </div>
  </div>

  <!-- MCP -->
  <div class="section" id="mcp">
    <h2>⚡ MCP Server (Claude / FAMA integration)</h2>
    <div class="mcp-box">
      <p class="desc" style="margin-bottom:1rem">The <code>mcp-server.js</code> exposes 4 tools for direct integration with Claude/FAMA via the Model Context Protocol.</p>
      
      <h3>Available Tools</h3>
      <table style="margin-bottom:1.5rem">
        <tr><th>Tool</th><th>Description</th></tr>
        <tr><td>f1_live_timing</td><td>Current session state — positions, gaps, tyres, sectors</td></tr>
        <tr><td>f1_strategy_analysis</td><td>Race strategy recommendations for a driver</td></tr>
        <tr><td>f1_session_analysis</td><td>Full pace analysis — ranking, teams, sectors, insights</td></tr>
        <tr><td>f1_upcoming_sessions</td><td>Next races & sessions with countdowns</td></tr>
      </table>

      <h3>Run the server</h3>
      <pre><code>cd /path/to/f1-live
node mcp-server.js</code></pre>

      <h3>Connect to OpenClaw (claude_desktop_config.json)</h3>
      <pre><code>{
  "mcpServers": {
    "f1-live": {
      "command": "node",
      "args": ["/path/to/f1-live/mcp-server.js"],
      "env": {
        "F1_API_BASE": "https://f1.fomo.com.ar"
      }
    }
  }
}</code></pre>

      <h3>Connect to FOMO fomo-core agent</h3>
      <pre><code># In fomo-core agent config, add HTTP tool pointing to:
GET https://f1.fomo.com.ar/api/agent/live
GET https://f1.fomo.com.ar/api/agent/strategy?driver={driver}&session_key={session_key}
GET https://f1.fomo.com.ar/api/agent/analysis?session_key={session_key}
GET https://f1.fomo.com.ar/api/agent/calendar</code></pre>
    </div>
  </div>

  <footer style="border-top:1px solid var(--border);padding-top:1rem;margin-top:2rem;color:var(--muted);font-size:0.8rem;text-align:center">
    F1 Live · Data by <a href="https://openf1.org" style="color:var(--muted)">OpenF1</a> · Built by FAMA for FOMO Pitwall Agent
  </footer>
</div>
</body>
</html>`;

export async function GET() {
  return new Response(HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
