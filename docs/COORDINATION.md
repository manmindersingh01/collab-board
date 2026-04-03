# Parallel Instance Coordination Contract

> This file is the single source of truth for all Claude Code instances working on CollabBoard in parallel.
> Every instance MUST read this file before writing any code.

## Golden Rules

1. **Work on your own git branch.** Never commit to `main`. Branch name is specified in your prompt.
2. **Only modify files you own.** If a file is not in your ownership list, treat it as READ-ONLY. You may read any file, but only write to files you own or create new files in your designated directories.
3. **Never modify shared files** listed below — these are the integration contract.
4. **Create new files** rather than editing shared ones. If you need a new component, create it in your designated directory.
5. **Follow existing patterns.** Read the existing code to understand conventions (neobrutalism styling, raw SQL for Card mutations, error handling patterns, API route structure).
6. **Run `pnpm build`** before committing to ensure your branch compiles.

---

## Shared Files (READ-ONLY for all instances)

These files are the stable contract. Do NOT modify them:

```
app/layout.tsx                    — Global layout + header nav
app/globals.css                   — Neobrutalism design system
app/board/[id]/board-view.tsx     — Main Kanban board (DnD, state management)
app/board/[id]/card-detail.tsx    — Card detail side panel
app/board/[id]/board-members.tsx  — Members modal + activity feed
app/board/[id]/page.tsx           — Board page server component
app/dashboard/page.tsx            — Dashboard page
app/my-tasks/page.tsx             — My Tasks page
lib/prisma.ts                     — Prisma client singleton
lib/user.ts                       — getDbUser() helper
lib/activity.ts                   — logActivity() helper
prisma/schema.prisma              — Database schema (coordinate changes!)
```

## Schema Changes

If your feature needs new Prisma models or fields:
1. Create a file `docs/schema-changes/<branch-name>.prisma` with ONLY the additions
2. Document what you need and why
3. Do NOT run `prisma migrate` — the coordinator (human) will merge schema changes
4. In your code, use raw SQL (`$executeRawUnsafe` / `$queryRawUnsafe`) for new tables/columns so your code works without the migration being applied yet. Alternatively, mock the data layer with a note.

---

## Existing Architecture Reference

### API Route Pattern
```typescript
// app/api/<resource>/route.ts
import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // ... business logic
}
```

### Card Mutations (IMPORTANT)
The Card model has `embeddings Unsupported("vector(1536)")?` which blocks Prisma's `create` and `update` at runtime. All Card writes use raw SQL:
```typescript
await prisma.$executeRaw`
  UPDATE "Card" SET "title" = ${title}, "updatedAt" = NOW() WHERE "id" = ${id}
`;
```
Card READS (findUnique, findMany, aggregate) work fine via Prisma.

### Component Pattern
- Server Components for pages (data fetching, auth checks)
- Client Components (`"use client"`) for interactive UI
- Neobrutalism classes: `neo-btn`, `neo-btn-primary`, `neo-card`, `neo-card-sm`, `neo-input`, `neo-badge`, `neo-overlay`
- Animations: `animate-fade-in`, `animate-slide-up`, `animate-slide-in-right`, `animate-pulse-neo`

### Types (commonly used across components)
```typescript
interface CardData {
  id: string; title: string; description: string | null;
  position: number; priority: string;
  dueDate: Date | string | null; labels: string[];
  completionListId: string | null;
  assignee: { id: string; name: string; avatarUrl: string | null } | null;
}

interface ListData {
  id: string; title: string; position: number; card: CardData[];
}

interface MemberData {
  userId: string; role: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}
```

### Database Models
```
User (id, email, name, avatarUrl, clerkId)
Board (id, name, description, ownerId, isArchived)
BoardMember (boardId+userId PK, role: owner|editer|viewer)
List (id, title, position, boardId)
Card (id, title, description, position, embeddings, priority, dueDate, labels[], completionListId, listId, assigneeId)
Comment (id, message, cardId, authorid, createdAt)
ActivityLog (id, action, entityType, entityId, metadata:JSONB, boardId, userId, createdAt)
```

### Existing API Routes
```
GET/POST   /api/boards
POST       /api/boards/[id]/lists
GET/POST   /api/boards/[id]/members
PATCH/DEL  /api/boards/[id]/members/[userId]
GET        /api/boards/[id]/activity
POST       /api/cards
GET/PATCH  /api/cards/[id]
PATCH      /api/cards/[id]/move
POST       /api/cards/[id]/complete
POST       /api/cards/[id]/comments
GET        /api/my-tasks
POST       /api/webhooks/clerk
```

---

## Integration Points

When your feature needs to hook into the existing board view or layout:

1. **Export a component** from your feature directory
2. **Document the integration** in your branch's README: "To integrate, import X from Y and add it to Z"
3. The human coordinator will wire it into the shared files during the merge phase

This avoids merge conflicts while allowing each instance to build complete, testable features.

---

## Package Installations

Each instance can install packages on their branch. Document any new dependencies in your branch's README so the coordinator knows what to `pnpm add` on main before merging.
