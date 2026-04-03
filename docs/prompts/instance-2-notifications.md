# Instance 2: Notifications + Due Date Reminders + Per-Card Activity

## Before you start
1. Read `docs/COORDINATION.md` — it has the rules, shared file list, and architecture reference
2. Read `docs/ROADMAP.md` — full feature plan for context
3. Create and switch to branch: `git checkout -b feat/notifications`
4. Run `pnpm install` and `pnpm build` to verify baseline

## Your mission
Build an in-app notification system, due date reminder infrastructure, and a per-card activity history view.

## Feature 1: In-app notifications

### Schema (document in docs/schema-changes/notifications.prisma)
```prisma
model Notification {
  id        String   @id @default(cuid())
  type      String   @db.VarChar(50)  // "card.assigned", "comment.added", "due.approaching", "due.overdue", "role.changed"
  title     String
  message   String
  link      String?                   // e.g. "/board/abc?card=xyz"
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  userId    String                    // recipient
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, createdAt])
}
```

Since you can't run migrations (shared schema rule), use raw SQL to create the table:
```sql
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "type" VARCHAR(50) NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "link" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
```

Create a setup script `scripts/setup-notifications.sql` with this SQL.

### API Routes
1. `GET /api/notifications` — List notifications for current user (newest first, limit 50). Include `unreadCount` in response.
2. `PATCH /api/notifications/read` — Mark specific notification IDs as read. Body: `{ ids: string[] }`. Also support `{ all: true }` to mark all as read.

### Notification creation helper: `lib/notify.ts`
```typescript
export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) { ... }
```
Use `$executeRawUnsafe` to insert since the table won't be in the Prisma schema.

### Notification triggers (document as integration points, don't modify shared routes)
Create `lib/notification-triggers.ts` with functions:
- `notifyCardAssigned(assigneeId, card, assigner)` — "Manminder assigned you to 'Fix login bug'"
- `notifyCommentAdded(cardId, comment, commenter)` — "Rahul commented on 'Fix login bug'"
- `notifyRoleChanged(userId, boardName, newRole, changedBy)` — "Your role changed to Editor on 'Sprint Board'"
- `notifyDueApproaching(userId, card)` — "'Fix login bug' is due tomorrow"
- `notifyDueOverdue(userId, card)` — "'Fix login bug' is overdue"

### UI: Notification bell component
Create `app/components/notification-bell.tsx` ("use client"):
- Bell icon with unread count badge (red dot with number)
- Click opens a dropdown panel showing recent notifications
- Each notification shows: icon by type, title, message, relative time, read/unread state
- Click a notification → mark as read + navigate to `link`
- "Mark all as read" button at the top
- Polls `/api/notifications` every 30 seconds for new notifications (or document SSE integration point)
- Neobrutalism styled (neo-card dropdown, neo-badge for count)

Document integration: "Add `<NotificationBell />` inside `<Show when='signed-in'>` in `app/layout.tsx`"

## Feature 2: Due date reminder cron

Create `app/api/cron/due-reminders/route.ts`:
- GET endpoint (called by external cron service like Vercel Cron or a simple cron job)
- Secured with a `CRON_SECRET` header check
- Queries cards where `dueDate` is within the next 24 hours and no reminder notification was sent yet
- Creates notifications for each assignee
- Queries cards where `dueDate` is past and no overdue notification was sent
- Creates overdue notifications
- To track "already notified": add a `metadata` JSONB check or use the Notification table (check if a notification with `type=due.approaching` already exists for this card+user)

## Feature 3: Per-card activity history

The ActivityLog table already has `entityId` indexed. Create:

1. `GET /api/cards/[id]/activity` — Returns activity logs where `entityId = cardId`, ordered by `createdAt desc`. Include user info.

2. `app/board/[id]/card-activity.tsx` — A component that fetches and displays the card's activity history. Timeline layout with user avatars, action descriptions, and relative timestamps.

Document integration: "Add `<CardActivity cardId={card.id} />` to the card detail panel after the comments section"

## Files you OWN (can create/modify)
```
app/api/notifications/route.ts             — NEW: GET notifications
app/api/notifications/read/route.ts        — NEW: PATCH mark as read
app/api/cron/due-reminders/route.ts        — NEW: cron endpoint
app/api/cards/[id]/activity/route.ts       — NEW: per-card activity
app/components/notification-bell.tsx        — NEW: bell UI component
app/board/[id]/card-activity.tsx            — NEW: per-card activity timeline
lib/notify.ts                              — NEW: notification creator
lib/notification-triggers.ts               — NEW: trigger functions
scripts/setup-notifications.sql            — NEW: table creation SQL
docs/schema-changes/notifications.prisma   — NEW: schema documentation
```

## Deliverable
A branch where:
- In-app notifications are created and viewable
- Due date reminders work via the cron endpoint
- Per-card activity history is a standalone component ready to plug in
- All integration points documented in branch README
