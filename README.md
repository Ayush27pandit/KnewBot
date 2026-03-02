# KnewBot 🤖

AI Teammate Memory Layer - A persistent organizational memory that AI agents and humans can query to understand decisions, incidents, and context across company tools.

## Vision

Turn fragmented company data into structured, temporal memory. Companies lose knowledge across Slack threads, docs, PR discussions, and tickets. KnewBot captures this and makes it queryable.

## Features

- **Slack Ask Bot** - Query company memory via `/ask` command
- **Semantic Search** - Find relevant decisions and incidents using vector embeddings
- **Source Attribution** - Every answer includes links to original sources
- **Confidence Scoring** - Know how confident the system is in each answer

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL with pgvector (NeonDB, Supabase, Aiven, or local)
- OpenRouter API key (free tier available)

### 1. Clone & Install

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in:

```env
# Database (NeonDB example)
DB_HOST=your-host.neon.tech
DB_PORT=5432
DB_NAME=neondb
DB_USER=your-user
DB_PASSWORD=your-password
DB_SSL=true

# OpenRouter (free LLM)
OPENROUTER_API_KEY=sk-or-v1-...

# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...

# App
PORT=3001
MODE=api
```

### 3. Setup Database

Run `src/db/schema.sql` in your PostgreSQL database, or use the SQL editor in NeonDB/Supabase.

### 4. Run

```bash
npm run dev
```

### 5. Insert Sample Data

```bash
npx tsx scripts/insert-mock-data.ts
npx tsx scripts/create-embeddings.ts
```

### 6. Test

In your Slack channel:
```
/ask why did we switch to postgres
```

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Slack     │    │   GitHub    │    │    Docs     │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          ▼
              ┌─────────────────────┐
              │   Ingestion Layer   │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │  Extraction Layer   │
              │   (OpenRouter AI)   │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │  Memory Graph Store  │
              │  (Postgres + pgvector)│
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │  Retrieval Layer    │
              │ (Vector + Rerank)   │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │   Interface Layer   │
              │ (Slack Bot + Web)   │
              └─────────────────────┘
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/search?q=` | GET | Search memories |
| `/api/memories?type=` | GET | List memories by type |
| `/api/ingest/slack` | POST | Ingest Slack messages |
| `/api/ingest/github` | POST | Ingest GitHub data |
| `/slack/events` | POST | Slack events & commands |

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL + pgvector
- **LLM**: OpenRouter (DeepSeek, etc.)
- **Slack**: Slack Bolt + Web API
- **Frontend**: React + Tailwind (in `/frontend`)

## Project Structure

```
knewbot/
├── src/
│   ├── api/server.ts       # Express API
│   ├── bot/slack.ts       # Slack bot
│   ├── db/
│   │   ├── connection.ts  # DB pool
│   │   ├── memory.ts      # Memory CRUD
│   │   └── schema.sql     # DB schema
│   ├── extraction/
│   │   └── gemini.ts      # LLM extraction
│   └── ingestion/
│       ├── slack.ts        # Slack connector
│       └── github.ts       # GitHub connector
├── frontend/               # React app
├── scripts/               # Utility scripts
└── package.json
```

## Slack Setup

1. Create app at https://api.slack.com/apps
2. Add OAuth scopes: `chat:write`, `channels:history`, `commands`
3. Create slash command `/ask` → URL: `https://your-domain/slack/events`
4. Install to workspace
5. Invite bot to channel: `/invite @KnewBot`

## Usage

### Slack Commands

```
/ask why did we switch to postgres
/ask what incidents have we had
/ask tell me about the auth system
```

### API Usage

```bash
# Search
curl "http://localhost:3001/api/search?q=postgres"

# List decisions
curl "http://localhost:3001/api/memories?type=decision"

# Ingest from GitHub
curl -X POST http://localhost:3001/api/ingest/github \
  -H "Content-Type: application/json" \
  -d '{"owner": "facebook", "repo": "react"}'
```

## Future Scope (V2)

See `Project Plan/KnewBotContext.md` for detailed roadmap including:
- AI-powered PR analysis
- Slack thread capture
- Jira/Linear integration
- Commit analysis
- Post-mortem automation

## License

MIT
