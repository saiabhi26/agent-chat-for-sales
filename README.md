# agent-chat-for-sales

[![CI](https://github.com/saiabhi26/agent-chat-for-sales/actions/workflows/ci.yml/badge.svg)](https://github.com/saiabhi26/agent-chat-for-sales/actions/workflows/ci.yml)

A real-time sales analytics dashboard with an AI chat agent that learns from corrections. Built with Next.js, Hono, SQLite, and Anthropic Claude.

---

## Prerequisites

Before you begin, make sure you have the following installed:

### 1. Node.js (v20+)

Check your version:

```bash
node -v
```

If not installed or below v20, install via nvm:

```bash
# Install nvm
brew install nvm

# Add nvm to your shell
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"

# Install and use Node 20
nvm install 20
nvm use 20
```

### 2. pnpm

```bash
npm install -g pnpm
```

### 3. Anthropic API Key

- Go to [console.anthropic.com](https://console.anthropic.com)
- Sign in and click **API Keys** → **Create Key**
- Copy the key — you'll need it in the backend setup below

---

## Setup

### Backend

```bash
cd backend
pnpm install
```

`better-sqlite3` is a native module, but no manual rebuild step is needed: `pnpm.onlyBuiltDependencies` in `backend/package.json` lets pnpm run its install script, which downloads a prebuilt binary (or compiles one if your Node version is new enough that no prebuild exists yet).

**Optional — create a `.env` file in the `backend` folder:**

Copy `backend/.env.example` to `backend/.env`. Every value has a working localhost default, so the app runs without it. Setting `ANTHROPIC_API_KEY` enables the AI chat; **without it the chat degrades gracefully and everything else — dashboard, filters, live updates — still works.**

```
ANTHROPIC_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with your actual Anthropic API key.

**Run the backend:**

```bash
pnpm dev
```

You should see:

```
DB empty. Seeding data via Claude...
Seeded 50 transactions.
Backend running on http://localhost:3001
```

The backend seeds 50 realistic sales transactions on first run using Claude API. It only does this once — subsequent runs skip seeding.

---

### Frontend

Open a new terminal tab:

```bash
cd frontend
pnpm install
pnpm dev
```

**Important — if you get an nvm error in a new terminal tab, run this first:**

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
nvm use 20
```

Then visit: **http://localhost:3000**

---

## What you'll see

- **Analytics cards** — total revenue, total transactions, avg deal size, top sales rep, top region. All update in real-time without page refresh.
- **Transactions table** — all 50 seeded transactions. Filters apply when you use the chat agent.
- **Chat agent** — type natural language queries to filter transactions. Shows confidence interpretation before applying filters.
- **+ New transaction** — opens a modal to add a new transaction. Table and analytics update instantly via SSE.

---

## Technical Approach

### Stack

- **Frontend** — Next.js, TypeScript, Tailwind CSS
- **Backend** — Hono, TypeScript, Node.js
- **Database** — SQLite via Drizzle ORM
- **Real-time** — Server-Sent Events (SSE)
- **AI** — Anthropic Claude API (claude-sonnet-4-5)

### Architecture

Clean separation of concerns across every layer:

- `db/schema.ts` — table definitions only
- `db/queries.ts` — all DB access in one place. Nothing else touches SQLite directly.
- `routes/` — HTTP handling only, no business logic
- `services/` — all business logic. Each service has one job.

Every service is independently importable. Adding a new feature means adding a new file — not modifying five existing ones.

### Real-time — SSE over WebSockets

SSE is one-way — server pushes to client. That's all we need here. Simpler than WebSockets, no handshake overhead, works over HTTP/1.1. Every connected client gets broadcast updates instantly when a new transaction is created.

### AI Agent

The chat agent converts natural language to structured SQL filters via Claude API.

**Confidence threshold** — Claude rates its own confidence as high or low based on query ambiguity. Clear queries execute silently. Ambiguous queries ask for confirmation first. This keeps UX fast without silently misinterpreting vague input.

**Correction memory** — stored in SQLite `corrections` table, persisted across sessions. Before every query, stored corrections are applied as string replacements on the raw query. "show me John's deals" after a correction automatically becomes "show me John Smith's deals."

**Drift detection** — monitors average deal size by region. Chosen because it's the most actionable signal for a sales manager — a single large deal immediately shifts the regional average and may indicate a big win or anomaly. Alert fires when a new transaction shifts a region's average by 10% or more. Surfaces proactively in the chat panel without being asked.

---

## Assumptions and Limitations

- All amounts treated as their stated currency value — no FX conversion for analytics
- Sales reps are fixed at seed time — can be added via DB but not via UI
- Chat state resets on page refresh — not persisted. Would store in DB with session ID in production.
- Drift alert only fires for the current browser session via SSE. Navigating away and back clears it.
- better-sqlite3 requires a manual native rebuild on Mac (arm64). Instructions above.

---

## One thing the agent got wrong

Initially Claude returned JSON wrapped in markdown fences (` ```json `) instead of raw JSON. This caused `JSON.parse()` to throw on every agent query and every seed run.

Fixed by stripping markdown fences before parsing:

```typescript
const clean = raw.replace(/```json|```/g, "").trim();
const parsed = JSON.parse(clean);
```

Applied this fix in both `seedService.ts` and `agentService.ts`. The system prompt also now explicitly instructs Claude to return only raw JSON with no markdown or explanation.

