@AGENTS.md

# CollabBoard

Collaborative Kanban board SaaS — like Jira/Linear/Trello — built with Next.js 16, React 19, Prisma 7, PostgreSQL + pgvector, Clerk auth, and a neobrutalism UI.

## Quick Start

```bash
docker compose up -d          # PostgreSQL (pgvector) + Redis
pnpm install
pnpm prisma migrate dev       # Apply migrations
pnpm dev                      # Start dev server at localhost:3000
```

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript, React 19
- **Styling:** Tailwind CSS v4 with neobrutalism design system (see `app/globals.css`)
- **Database:** PostgreSQL 16 + pgvector via Docker (`docker-compose.yml`)
- **ORM:** Prisma 7 with `@prisma/adapter-pg` (generated to `app/generated/prisma/`)
- **Auth:** Clerk (`@clerk/nextjs`) with webhook sync to User table
- **DnD:** `@dnd-kit/core` + `@dnd-kit/sortable`
- **Markdown:** `react-markdown`
- **Cache:** Redis via `ioredis` (client in `lib/redis.ts`)
- **Package manager:** pnpm

## Critical: Card Mutations Use Raw SQL

The Card model has `embeddings Unsupported("vector(1536)")?` which blocks Prisma's `create` and `update` at runtime. **All Card writes must use `$executeRaw` or `$executeRawUnsafe`**. Card reads (findUnique, findMany, aggregate) work normally via Prisma.

## Project Structure

```
app/
  api/
    boards/         — Board CRUD + members + activity + lists
    cards/          — Card CRUD + move + complete + comments
    my-tasks/       — Cards assigned to current user
    webhooks/       — Clerk + Stripe webhooks
  board/[id]/       — Kanban board page (DnD, card detail, members)
  dashboard/        — Board listing + create
  my-tasks/         — Assigned tasks page
  globals.css       — Neobrutalism design system
lib/
  prisma.ts         — Prisma client singleton
  user.ts           — getDbUser() from Clerk session
  activity.ts       — Fire-and-forget activity logger
prisma/
  schema.prisma     — Full data model
docs/
  ROADMAP.md        — Full SaaS feature roadmap (28 features, 4 tiers)
  COORDINATION.md   — Parallel instance contract for multi-agent development
  prompts/          — Ready-to-use prompts for 5 parallel Claude Code instances
```

## RBAC Model

- **Owner:** Full control — invite/remove members, add lists, manage board
- **Editor (`editer` in DB):** Create/move/edit cards, add comments
- **Viewer:** Read-only + can complete cards assigned to them + add comments

## Neobrutalism CSS Classes

Defined in `globals.css` — use these instead of reinventing styles:
- `neo-btn`, `neo-btn-primary`, `neo-btn-secondary`, `neo-btn-ghost`, `neo-btn-danger`
- `neo-card`, `neo-card-sm`, `neo-card-interactive`
- `neo-input`, `neo-badge`, `neo-overlay`
- `animate-fade-in`, `animate-slide-up`, `animate-slide-in-right`, `animate-pulse-neo`

## Conventions

- API routes return `NextResponse.json(...)` with appropriate status codes
- Auth check: always call `getDbUser()` first, return 401 if null
- Activity logging: call `logActivity()` after successful mutations (fire-and-forget)
- Card position: fractional indexing (midpoint between neighbors). Only one row updated per move.
- Optimistic UI: update local state immediately, PATCH in background, rollback on failure
