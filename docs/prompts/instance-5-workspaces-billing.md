# Instance 5: Workspaces + Stripe Billing + Analytics Dashboard

## Before you start
1. Read `docs/COORDINATION.md` — it has the rules, shared file list, and architecture reference
2. Read `docs/ROADMAP.md` — full feature plan for context
3. Create and switch to branch: `git checkout -b feat/workspaces-billing`
4. Run `pnpm install` and `pnpm build` to verify baseline

## Your mission
Build multi-tenant workspaces, Stripe subscription billing, and a basic analytics dashboard.

## Feature 1: Workspaces

### Schema (document in docs/schema-changes/workspaces-billing.prisma)
```prisma
model Workspace {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  logoUrl     String?
  plan        Plan     @default(FREE)
  stripeCustomerId     String?  @unique
  stripeSubscriptionId String?  @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members     WorkspaceMember[]
  boards      Board[]           // boards now belong to a workspace

  @@index([slug])
}

enum Plan {
  FREE
  PRO
  ENTERPRISE
}

model WorkspaceMember {
  role        WorkspaceRole @default(MEMBER)
  joinedAt    DateTime      @default(now())

  workspaceId String
  userId      String

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([workspaceId, userId])
}

enum WorkspaceRole {
  ADMIN
  MEMBER
  GUEST
}
```

Use raw SQL to create tables (can't modify shared schema).
Create `scripts/setup-workspaces.sql` with the CREATE TABLE statements.

### Plan limits
```typescript
// lib/plan-limits.ts
export const PLAN_LIMITS = {
  FREE:       { boards: 3, membersPerBoard: 5,  fileStorageMb: 100 },
  PRO:        { boards: -1, membersPerBoard: -1, fileStorageMb: 5000 },  // -1 = unlimited
  ENTERPRISE: { boards: -1, membersPerBoard: -1, fileStorageMb: 50000 },
};
```

### API Routes

1. `POST /api/workspaces` — Create workspace. Creates the workspace + adds current user as ADMIN.
2. `GET /api/workspaces` — List workspaces the current user belongs to.
3. `GET /api/workspaces/[slug]` — Get workspace details with member count and board count.
4. `PATCH /api/workspaces/[slug]` — Update workspace (name, logo). Admin only.
5. `POST /api/workspaces/[slug]/members` — Invite member. Admin only.
6. `DELETE /api/workspaces/[slug]/members/[userId]` — Remove member. Admin only.

### UI: Workspace selector
Create `app/components/workspace-selector.tsx`:
- Dropdown in the header showing current workspace
- Switch between workspaces
- "Create workspace" option at the bottom
- Document integration: "Add to layout.tsx header, left of Dashboard link"

### UI: Workspace settings page
Create `app/workspace/[slug]/settings/page.tsx`:
- Workspace name, logo, slug
- Members list with role management
- Current plan + upgrade button
- Danger zone: delete workspace

### UI: Workspace creation flow
Create `app/workspace/new/page.tsx`:
- Form: workspace name → auto-generate slug
- After creation, redirect to workspace settings or dashboard

## Feature 2: Stripe billing

### Install dependency
`pnpm add stripe`

### Environment variables needed (document in README)
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### API Routes

1. `POST /api/stripe/checkout` — Create Stripe Checkout session for upgrading to Pro.
   - Creates/retrieves a Stripe Customer for the workspace
   - Creates a Checkout Session with the Pro price
   - Returns the checkout URL

2. `POST /api/stripe/portal` — Create Stripe Customer Portal session for managing subscription.
   - Returns the portal URL (change plan, cancel, update payment)

3. `POST /api/webhooks/stripe` — Stripe webhook handler.
   - Verify webhook signature
   - Handle events:
     - `checkout.session.completed` → upgrade workspace to PRO
     - `customer.subscription.updated` → sync plan status
     - `customer.subscription.deleted` → downgrade to FREE
   - Update workspace.plan and stripeSubscriptionId

### Stripe configuration helper: `lib/stripe.ts`
```typescript
import Stripe from 'stripe';
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```

### UI: Pricing page
Create `app/pricing/page.tsx`:
- Three pricing tiers: Free, Pro ($8/user/month), Enterprise (Contact us)
- Feature comparison table
- "Get Started" / "Upgrade" CTAs
- Neobrutalism styled pricing cards
- For Pro: clicking "Upgrade" calls POST /api/stripe/checkout and redirects

### UI: Plan enforcement
Create `lib/plan-enforcement.ts`:
- `checkBoardLimit(workspaceId)` — returns whether the workspace can create more boards
- `checkMemberLimit(boardId)` — returns whether the board can add more members
- Document integration: "Call checkBoardLimit before creating a board in POST /api/boards"

## Feature 3: Analytics dashboard

### API Route: `GET /api/workspaces/[slug]/analytics`
Returns metrics for the workspace:
```typescript
{
  totalCards: number;
  completedCards: number;        // cards in "Done" lists
  overdueCards: number;
  cardsByPriority: { priority: string; count: number }[];
  cardsByList: { listTitle: string; count: number }[];    // across all boards
  cardsCompletedPerWeek: { week: string; count: number }[];  // last 8 weeks
  averageCycleTime: number;      // avg days from card creation to Done
  topMembers: { name: string; avatarUrl: string; completed: number }[];
}
```

Use raw SQL with aggregations for performance:
```sql
SELECT COUNT(*) as total,
       COUNT(*) FILTER (WHERE l.title ILIKE '%done%') as completed,
       COUNT(*) FILTER (WHERE c."dueDate" < NOW() AND l.title NOT ILIKE '%done%') as overdue
FROM "Card" c
JOIN "List" l ON c."listId" = l.id
JOIN "Board" b ON l."boardId" = b.id
WHERE b."workspaceId" = $1 AND b."isArchived" = false
```

### UI: Analytics page
Create `app/workspace/[slug]/analytics/page.tsx`:
- Summary stats row: Total Cards, Completed, Overdue, Avg Cycle Time
- Bar chart: Cards by priority (can use simple CSS bars, no charting library needed)
- Bar chart: Cards completed per week (last 8 weeks)
- Table: Top contributors with avatar, name, and cards completed
- Neobrutalism styled: neo-cards for each section, bold numbers, colored bars

### CSS-only charts approach
No need for a charting library. Use CSS bars:
```tsx
<div className="h-32 flex items-end gap-2">
  {data.map(d => (
    <div
      key={d.label}
      className="flex-1 bg-neo-blue border-2 border-neo-black rounded-t"
      style={{ height: `${(d.value / max) * 100}%` }}
    />
  ))}
</div>
```

## Files you OWN (can create/modify)
```
app/api/workspaces/route.ts                        — NEW: GET/POST workspaces
app/api/workspaces/[slug]/route.ts                 — NEW: GET/PATCH workspace
app/api/workspaces/[slug]/members/route.ts         — NEW: POST invite
app/api/workspaces/[slug]/members/[userId]/route.ts — NEW: DELETE member
app/api/workspaces/[slug]/analytics/route.ts       — NEW: analytics data
app/api/stripe/checkout/route.ts                   — NEW: create checkout
app/api/stripe/portal/route.ts                     — NEW: customer portal
app/api/webhooks/stripe/route.ts                   — NEW: stripe webhooks
app/components/workspace-selector.tsx              — NEW: workspace dropdown
app/workspace/new/page.tsx                         — NEW: create workspace flow
app/workspace/[slug]/settings/page.tsx             — NEW: workspace settings
app/workspace/[slug]/analytics/page.tsx            — NEW: analytics dashboard
app/pricing/page.tsx                               — NEW: pricing tiers page
lib/stripe.ts                                      — NEW: Stripe client
lib/plan-limits.ts                                 — NEW: plan limit definitions
lib/plan-enforcement.ts                            — NEW: limit checking functions
scripts/setup-workspaces.sql                       — NEW: table creation SQL
docs/schema-changes/workspaces-billing.prisma      — NEW: schema docs
```

## Dependencies to install
- `stripe` — Stripe SDK

## Deliverable
A branch where:
- Workspace CRUD works (create, list, settings, member management)
- Stripe checkout flow creates a session and the webhook syncs the plan
- Plan limits are defined and enforcement functions exist
- Analytics dashboard shows workspace-wide metrics with CSS-only charts
- Pricing page with three tiers is styled and functional
- All integration points documented in branch README
