# CollabBoard

A full-stack collaborative project management platform built with Next.js 16, React 19, and PostgreSQL. Think Jira meets Linear — Kanban boards, real-time sync, drag-and-drop, role-based access, time tracking, automations, integrations, and a public API. Designed with a neobrutalism UI.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![Tests](https://img.shields.io/badge/Tests-313%20passing-green)

---

## Features

### Core
- **Kanban boards** with drag-and-drop (dnd-kit), fractional indexing, optimistic updates
- **Multiple views** — Board (Kanban), Table (spreadsheet), Calendar (monthly grid)
- **Card detail panel** — inline editing for title, description (Markdown), priority, labels, due date, assignee
- **Comments** with optimistic add and author avatars
- **Real-time collaboration** via Server-Sent Events + Redis pub/sub — changes sync across tabs instantly
- **RBAC** — Owner / Editor / Viewer with per-board permissions enforced at API and UI level
- **Board members** — invite by email, role management, activity feed
- **My Tasks** — personal view of all assigned cards across boards
- **Global search** + `Cmd+K` command palette
- **Keyboard shortcuts** — `C` (add card), `F` (filter), `?` (cheat sheet)

### Productivity
- **Automations** — rule engine: "When card moves to Done, unassign" or "When priority is Urgent, add label hotfix"
- **Time tracking** — start/stop timer, manual entries, board-level reports with by-user/by-card/by-day breakdowns
- **Card & board templates** — reusable presets per board, pre-built board configurations
- **Custom completion targets** — owner sets where a card goes when the assignee clicks "Complete"
- **Filters** — by assignee, priority, label, due date with URL persistence
- **Archive / restore** for boards and cards

### Integrations
- **Slack** — auto-post card events to a channel via webhook
- **GitHub** — link PRs to cards, auto-create cards from PRs, move cards on merge
- **Import** from Trello (JSON), Jira (CSV), generic CSV
- **Export** as JSON or CSV

### Platform
- **Workspaces** — multi-tenant organizations with Admin/Member/Guest roles
- **Stripe billing** — Free / Pro / Enterprise tiers with Checkout + Customer Portal
- **Public REST API** (`/api/v1/`) with API key auth, rate limiting (60 req/min via Redis)
- **Outgoing webhooks** — HMAC-SHA256 signed payloads to external endpoints
- **In-app notifications** with unread badge, triggered on assignment, comments, due dates
- **Activity log** — per-board and per-card event history
- **Due date reminders** — cron endpoint for approaching/overdue alerts

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5, React 19 |
| Styling | Tailwind CSS v4, custom neobrutalism design system |
| Database | PostgreSQL 16 + pgvector |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Auth | Clerk (webhook sync to User table) |
| Real-time | SSE + Redis pub/sub (ioredis) |
| DnD | @dnd-kit/core + @dnd-kit/sortable |
| Payments | Stripe (Checkout, Portal, Webhooks) |
| Testing | Vitest (313 tests, 43 files) |
| Markdown | react-markdown |

---

## Architecture

```
                    ┌─────────────────────────────────┐
                    │         Next.js 16 App           │
                    │       (App Router, RSC)          │
                    └──────────┬──────────────────────┘
                               │
          ┌────────────────────┼─────────────────────┐
          │                    │                     │
   ┌──────▼──────┐    ┌───────▼──────┐    ┌────────▼────────┐
   │   Pages &    │    │  56 API      │    │  Public API     │
   │  Components  │    │  Routes      │    │  /api/v1/       │
   │  (React 19)  │    │  (internal)  │    │  (API key auth) │
   └──────┬───────┘    └───────┬──────┘    └────────┬────────┘
          │                    │                     │
          │            ┌───────▼──────────────────────▼──┐
          │            │           Prisma 7 ORM          │
          │            └───────┬─────────────────────────┘
          │                    │
    ┌─────▼─────┐    ┌────────▼────────┐    ┌──────────────┐
    │  SSE via   │    │  PostgreSQL 16  │    │    Redis     │
    │  Redis     │◄──►│  + pgvector     │    │  (pub/sub +  │
    │  pub/sub   │    │                 │    │  rate limit)  │
    └────────────┘    └─────────────────┘    └──────────────┘
```

**Key decisions:**
- **Fractional indexing** for card positions — only 1 row updated per drag instead of N
- **Optimistic UI** — local state updates immediately, API syncs in background, rollback on failure
- **Server Components** for pages, **Client Components** for interactivity
- **Fire-and-forget** for activity logs, notifications, and realtime broadcasts

---

## Database

16 models across the schema:

```
User ──┬── BoardMember ── Board ──┬── List ── Card ──┬── Comment
       │                          │                  ├── TimeEntry
       ├── WorkspaceMember        ├── Automation     └── (pgvector embeddings)
       │                          ├── Integration
       ├── Notification           ├── WebhookEndpoint
       ├── TimeEntry              └── CardTemplate
       └── ApiKey ── Workspace
```

---

## Getting Started

### Prerequisites
- Node.js 18+, pnpm
- Docker
- [Clerk](https://clerk.com) account

### Setup

```bash
git clone https://github.com/manmindersingh01/collab-board.git
cd collab-board

# Start databases
docker compose up -d

# Install
pnpm install

# Environment
cp .env.example .env
# Fill in: DATABASE_URL, CLERK keys, REDIS_URL

# Migrate + run
pnpm prisma migrate dev
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk frontend key |
| `CLERK_SECRET_KEY` | Yes | Clerk backend key |
| `CLERK_WEBHOOK_SECRET` | Yes | Clerk webhook verification |
| `REDIS_URL` | Yes | Redis connection (default: `redis://localhost:6379`) |
| `STRIPE_SECRET_KEY` | No | Stripe billing |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook verification |
| `CRON_SECRET` | No | Auth for cron endpoints |

---

## Running Tests

```bash
pnpm test              # 313 tests
pnpm test:watch        # watch mode
pnpm test:coverage     # with coverage
```

---

## API

### Internal (56 routes, Clerk cookie auth)

| Area | Endpoints |
|---|---|
| Boards | CRUD, archive, members, lists, activity, templates, automations, integrations, webhooks, time reports, export |
| Cards | CRUD, move, complete, archive, comments, time tracking, per-card activity |
| Search | Global full-text search |
| Notifications | List, mark as read |
| Workspaces | CRUD, members, analytics, API keys |
| Billing | Stripe checkout, portal, webhook |

### Public (`/api/v1/`, API key auth)

```
GET    /api/v1/boards
GET    /api/v1/boards/:id
GET    /api/v1/boards/:id/cards
POST   /api/v1/boards/:id/cards
PATCH  /api/v1/boards/:id/cards/:cardId
POST   /api/v1/boards/:id/cards/:cardId/move
GET    /api/v1/boards/:id/lists
POST   /api/v1/boards/:id/lists
```

Auth: `Authorization: Bearer cb_live_...` | Rate limit: 60 req/min

---

## Project Stats

| Metric | Count |
|---|---|
| Lines of code | 23,500+ |
| API routes | 56 |
| Test files | 43 |
| Tests passing | 313 |
| Prisma models | 16 |
| Pages | 10 |

---

## License

MIT
