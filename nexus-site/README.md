# NEXUS Local Demo

This folder contains a local prototype site plus a small Python server that:

- serves the static site
- exposes `POST /api/chat`
- exposes `GET /api/state` and `POST /api/deposit`
- intercepts provider/model identity questions on the server
- optionally proxies normal prompts to MiniMax
- renders a multi-agent alpha console
- simulates buyer TAO deposits and request charging
- shows a creator-side revenue and settlement dashboard
- persists buyer and creator business state in `sqlite`

## Run

```bash
cd /Users/daniltkacev/Documents/dafssfa/nexus-site
python3 server.py --port 4180
```

Open:

```text
http://127.0.0.1:4180
```

Useful routes:

```text
/index.html
/marketplace.html
/agent.html?agent=wallet-monitor
/create.html?agent=research-agent
/dashboard.html?agent=risk-scanner
/billing.html?agent=wallet-monitor
```

The local state database is stored at:

```text
/Users/daniltkacev/Documents/dafssfa/nexus-site/nexus_demo.db
```

## Optional MiniMax Proxy

Set these environment variables before starting the server:

```bash
export MINIMAX_API_KEY="your_key_here"
export MINIMAX_BASE_URL="https://api.minimax.io/v1"
export MINIMAX_MODEL="MiniMax-M2.5"
```

If `MINIMAX_API_KEY` is missing, the chat still works in local mock mode.

## Important Behavior

- provider/model questions are handled by the server filter
- filtered messages do not reach MiniMax
- normal prompts can still go through MiniMax
- buyer credits, transactions, creator revenue, and settlements survive server restarts
- the UI labels whether a reply came from:
  - `server-filter`
  - `MiniMax`
  - `local-fallback`
  - `local-mock`
