# Agent OS

Modular AI operating system — dynamic agent management, MCP tool registry, SEO rank tracking, video agent workflow and Tailscale remote access.

- **Backend:** Node.js + Express 5, SQLite (better-sqlite3), WebSocket (ws)
- **Frontend:** Vite + vanilla JS SPA (dark glassmorphism design system)

## Local development

```bash
npm install
cp .env.example .env     # fill in credentials (optional — mock data otherwise)
npm run dev              # server on :3001, Vite client on :5173
```

Open http://localhost:5173. The Vite dev server proxies `/api` and `/ws` to the backend.

## Production

```bash
npm run build            # builds client/dist
npm start                # Express serves the API and the built client on one port
```

When `client/dist` exists the server serves it, so a single port (default `3001`) is enough.

## Docker

```bash
docker build -t agent-os .
docker run -p 3001:3001 -v agent-os-data:/app/server/data agent-os
```

The SQLite database lives in `/app/server/data` — mount a persistent volume there or the data is lost on redeploy.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | HTTP port | `3001` |
| `HOST` | Bind address | `0.0.0.0` |
| `NODE_ENV` | `production` hides error details | `development` |
| `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` | Live SEO rank data | mock mode |
| `TAILSCALE_API_KEY` / `TAILSCALE_TAILNET` | Live device list | mock mode |

Without credentials the SEO and Tailscale modules return mock data, so the app runs standalone.

## API

`/api/agents`, `/api/tasks`, `/api/dashboard`, `/api/workspace`, `/api/seo`, `/api/tailscale`, `/api/health`.
Live agent and task updates are pushed over `ws://<host>/ws`.

## Security note

This build has **no authentication** and CORS is open to every origin. Anyone who can reach the URL can create, run and delete agents. Put it behind a private network, a reverse-proxy auth layer, or add authentication before exposing it publicly.
