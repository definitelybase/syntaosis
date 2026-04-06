# synTAOsis Local Site

This folder contains the current synTAOsis localhost product/protocol interface plus a small Python server that:

- serves the static multi-page site
- exposes `GET /api/config`, `GET /api/state`, and `POST /api/chat`
- intercepts provider/model identity questions on the server
- can optionally proxy normal prompts to MiniMax
- renders the current public Core surface plus protocol explainer pages for:
  - `Treasury`
  - `Market`
  - `Executor`
  - `Capital`
  - `Registry`
- keeps contract addresses and onchain references as `TBA` until real deployment

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
/dashboard.html?agent=wallet-monitor
/billing.html?agent=wallet-monitor
/create.html?agent=wallet-monitor
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
- the UI labels whether a reply came from:
  - `server-filter`
  - `MiniMax`
  - `local-fallback`
  - `local-mock`
