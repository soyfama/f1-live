#!/usr/bin/env node
/**
 * F1 Live — MCP Server (Model Context Protocol)
 * Exposes F1 data as tools for Claude/FAMA agents
 *
 * Usage:   node mcp-server.js
 * Env:     F1_API_BASE=https://f1.fomo.com.ar (default: http://localhost:3000)
 *
 * Connect to OpenClaw claude_desktop_config.json:
 * {
 *   "mcpServers": {
 *     "f1-live": {
 *       "command": "node",
 *       "args": ["/path/to/f1-live/mcp-server.js"],
 *       "env": { "F1_API_BASE": "https://f1.fomo.com.ar" }
 *     }
 *   }
 * }
 */

const BASE = process.env.F1_API_BASE || 'http://localhost:3000';

// MCP protocol over stdio (JSON-RPC 2.0)
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, terminal: false });

const TOOLS = [
  {
    name: 'f1_live_timing',
    description: 'Get real-time F1 race/session timing data. Returns current positions, gaps, lap times, sector times, tyre compounds and ages for all drivers in the latest or current session. Use this during a live session to know current standings.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'f1_strategy_analysis',
    description: 'Analyze and simulate race strategies for a specific F1 driver. Returns 6 strategy options ranked by estimated race time, with pit stop counts, compounds, and time deltas. Also includes the driver\'s real stint data from the session.',
    inputSchema: {
      type: 'object',
      properties: {
        session_key: {
          type: 'string',
          description: 'OpenF1 session key (e.g. "9159" for AUS 2025 Race). Use "latest" for current session.',
        },
        driver: {
          type: 'string',
          description: 'Driver acronym (e.g. "VER", "LEC", "PIA", "NOR") or driver number (e.g. "1", "16")',
        },
      },
      required: [],
    },
  },
  {
    name: 'f1_session_analysis',
    description: 'Get comprehensive analysis of an F1 session: pace ranking of all drivers, team pace comparison, long-run degradation analysis, best sector times, speed trap data, and AI-generated key insights. Best used after a session to understand performance.',
    inputSchema: {
      type: 'object',
      properties: {
        session_key: {
          type: 'string',
          description: 'OpenF1 session key. Use "latest" for most recent session. Example known sessions: 9159 (AUS 2025 Race).',
        },
      },
      required: [],
    },
  },
  {
    name: 'f1_upcoming_sessions',
    description: 'Get the upcoming F1 sessions and races with countdowns. Returns the next 5 sessions, next 5 races, and the very next event. Race times include UTC-3 (Buenos Aires) timezone. Use to answer "when is the next F1 race?" type questions.',
    inputSchema: {
      type: 'object',
      properties: {
        year: {
          type: 'number',
          description: 'Season year (e.g. 2026). Defaults to current year.',
        },
      },
      required: [],
    },
  },
];

async function callTool(name, args) {
  const params = new URLSearchParams();
  if (args.session_key) params.set('session_key', args.session_key);
  if (args.driver) params.set('driver', args.driver);
  if (args.year) params.set('year', String(args.year));

  const endpoints = {
    f1_live_timing: `${BASE}/api/agent/live`,
    f1_strategy_analysis: `${BASE}/api/agent/strategy?${params}`,
    f1_session_analysis: `${BASE}/api/agent/analysis?${params}`,
    f1_upcoming_sessions: `${BASE}/api/agent/calendar?${params}`,
  };

  const url = endpoints[name];
  if (!url) throw new Error(`Unknown tool: ${name}`);

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

  // Format as concise text for the LLM
  return formatForLLM(name, data);
}

function formatForLLM(toolName, data) {
  try {
    if (toolName === 'f1_live_timing') {
      const s = data.session;
      const lines = [
        `SESSION: ${s.year} ${s.country} GP — ${s.name} | Status: ${s.status.toUpperCase()} | Remaining: ${s.remaining}`,
        `Circuit: ${s.circuit} | ${data.meta.total_drivers} drivers`,
        '',
        'LIVE STANDINGS:',
        'Pos | Driver | Team            | Gap        | Best Lap   | Last Lap   | Tyre | Age | Lap',
        '----|--------|-----------------|------------|------------|------------|------|-----|----',
      ];
      for (const d of (data.drivers || []).slice(0, 20)) {
        lines.push(
          `${String(d.pos).padStart(3)} | ${d.driver.padEnd(6)} | ${(d.team || '').slice(0, 15).padEnd(15)} | ${(d.gap || '--').padStart(10)} | ${(d.best_lap || '--').padStart(10)} | ${(d.last_lap || '--').padStart(10)} | ${(d.tyre || '--').toUpperCase().padStart(4)} | ${String(d.tyre_age ?? '--').padStart(3)} | ${d.laps ?? '--'}`
        );
      }
      return lines.join('\n');
    }

    if (toolName === 'f1_strategy_analysis') {
      const lines = [
        `STRATEGY ANALYSIS: ${data.driver} (${data.team})`,
        `Session: ${data.session?.name} — ${data.session?.country}`,
        `Base lap: ${data.race_params?.best_lap_time} | Total laps: ${data.race_params?.total_laps} | Pit loss: ${data.race_params?.pit_loss_seconds}s`,
        '',
        'ACTUAL STINTS:',
      ];
      for (const s of (data.actual_stints || [])) {
        lines.push(`  Stint ${s.stint_number}: ${s.compound.toUpperCase()} | L${s.lap_start}→L${s.lap_end} (${s.laps} laps) | Avg: ${s.avg_lap_formatted}`);
      }
      lines.push('', 'RECOMMENDED STRATEGIES (ranked by estimated race time):');
      for (const s of (data.recommended_strategies || [])) {
        const marker = s.rank === 1 ? '🏆 ' : `${s.rank}.  `;
        lines.push(`${marker}${s.label} | ${s.estimated_race_time} | Delta: ${s.delta} | Stints: ${s.stints_detail?.map(st => `${st.laps}L ${st.compound}`).join(' → ')}`);
      }
      lines.push('', `OPTIMAL: ${data.optimal_strategy?.label} (${data.optimal_strategy?.stops} stops)`);
      return lines.join('\n');
    }

    if (toolName === 'f1_session_analysis') {
      const lines = [
        `SESSION ANALYSIS: ${data.session}`,
        '',
        'PACE RANKING:',
        'Pos | Driver | Team            | Best Lap   | Gap    | Laps',
        '----|--------|-----------------|------------|--------|-----',
      ];
      for (const d of (data.pace_ranking || []).slice(0, 20)) {
        lines.push(
          `${String(d.pos).padStart(3)} | ${d.driver.padEnd(6)} | ${(d.team || '').slice(0, 15).padEnd(15)} | ${(d.best_lap || '--').padStart(10)} | +${String(d.gap_to_leader).padStart(5)} | ${d.laps_completed}`
        );
      }
      lines.push('', 'TEAM PACE:');
      for (const t of (data.team_pace || []).slice(0, 10)) {
        lines.push(`  ${t.pos}. ${t.team.padEnd(20)} ${t.best_lap}  +${t.gap_to_leader}`);
      }
      if (data.long_run_pace?.length) {
        lines.push('', 'LONG RUN PACE (5+ lap stints):');
        for (const r of data.long_run_pace.slice(0, 8)) {
          lines.push(`  ${r.driver} | ${r.compound.toUpperCase()} | ${r.laps} laps | Avg: ${r.avg_lap} | Deg: ${r.deg_per_lap}`);
        }
      }
      if (data.key_insights?.length) {
        lines.push('', 'KEY INSIGHTS:');
        for (const ins of data.key_insights) lines.push(`  • ${ins}`);
      }
      return lines.join('\n');
    }

    if (toolName === 'f1_upcoming_sessions') {
      const lines = [
        `F1 CALENDAR ${data.year} — ${data.total_rounds} rounds`,
        '',
      ];
      if (data.next_session) {
        const ns = data.next_session;
        lines.push(`NEXT UP: ${ns.name} @ ${ns.country} (${ns.circuit}) — ${ns.countdown}`);
        lines.push(`  Date: ${ns.date}`);
        lines.push('');
      }
      lines.push('UPCOMING SESSIONS:');
      for (const s of (data.upcoming_sessions || [])) {
        lines.push(`  • ${s.name} — ${s.country} | ${s.countdown} | ${s.date}`);
      }
      lines.push('', 'NEXT 5 RACES:');
      for (const r of (data.upcoming_races || []).slice(0, 5)) {
        lines.push(`  • ${r.name} @ ${r.circuit} | ${r.countdown} | UTC: ${r.race_date} | ART: ${r.race_date_ar}`);
      }
      return lines.join('\n');
    }

    // Fallback: return compact JSON
    return JSON.stringify(data, null, 2).slice(0, 8000);
  } catch {
    return JSON.stringify(data, null, 2).slice(0, 8000);
  }
}

function sendResponse(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

async function handleRequest(req) {
  const { id, method, params } = req;

  if (method === 'initialize') {
    return sendResponse({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'f1-live-pitwall', version: '1.0.0' },
      },
    });
  }

  if (method === 'notifications/initialized') {
    return; // no response needed
  }

  if (method === 'tools/list') {
    return sendResponse({
      jsonrpc: '2.0',
      id,
      result: { tools: TOOLS },
    });
  }

  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params;
    try {
      const result = await callTool(name, args);
      return sendResponse({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: result }],
        },
      });
    } catch (err) {
      return sendResponse({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        },
      });
    }
  }

  // Unknown method
  sendResponse({
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  });
}

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const req = JSON.parse(trimmed);
    await handleRequest(req);
  } catch (err) {
    // Parse error
    sendResponse({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: `Parse error: ${err.message}` },
    });
  }
});

process.stderr.write('[f1-live MCP] Server started. Waiting for JSON-RPC requests...\n');
process.stderr.write(`[f1-live MCP] API base: ${BASE}\n`);
