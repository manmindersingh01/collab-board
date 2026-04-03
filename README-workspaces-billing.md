# Instance 5: Workspaces + Stripe Billing + Analytics Dashboard

Branch: `feat/workspaces-billing`

## New Dependencies

```bash
pnpm add stripe
```

## Environment Variables Required

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Database Setup

Run the SQL setup script before using this feature:

```bash
psql $DATABASE_URL < scripts/setup-workspaces.sql
```

This creates the `Workspace` and `WorkspaceMember` tables, plus adds a nullable `workspaceId` column to the `Board` table.

Schema changes are documented in `docs/schema-changes/workspaces-billing.prisma`.

## New Files

### Library / Config
| File | Purpose |
|------|---------|
| `lib/stripe.ts` | Stripe SDK client singleton |
| `lib/plan-limits.ts` | Plan limit definitions (FREE/PRO/ENTERPRISE) |
| `lib/plan-enforcement.ts` | `checkBoardLimit()` and `checkMemberLimit()` functions |
| `scripts/setup-workspaces.sql` | SQL to create workspace tables |

### API Routes
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/workspaces` | GET, POST | List/create workspaces |
| `/api/workspaces/[slug]` | GET, PATCH | Get/update workspace details |
| `/api/workspaces/[slug]/members` | POST | Invite member (admin only) |
| `/api/workspaces/[slug]/members/[userId]` | DELETE | Remove member (admin only) |
| `/api/workspaces/[slug]/analytics` | GET | Workspace-wide analytics data |
| `/api/stripe/checkout` | POST | Create Stripe Checkout session |
| `/api/stripe/portal` | POST | Create Stripe Customer Portal session |
| `/api/webhooks/stripe` | POST | Stripe webhook handler |

### UI Pages
| Page | Purpose |
|------|---------|
| `app/workspace/new/page.tsx` | Create workspace flow |
| `app/workspace/[slug]/settings/page.tsx` | Workspace settings, members, billing |
| `app/workspace/[slug]/analytics/page.tsx` | Analytics dashboard with CSS-only charts |
| `app/pricing/page.tsx` | Pricing tiers with feature comparison |
| `app/components/workspace-selector.tsx` | Workspace dropdown component |

## Integration Points

These are the changes needed in shared files during the merge phase:

### 1. Workspace Selector in Header
**File:** `app/layout.tsx`
**Action:** Add `<WorkspaceSelector />` to the header, left of the Dashboard link (inside the `<Show when="signed-in">` block).
```tsx
import WorkspaceSelector from "@/app/components/workspace-selector";
// Add inside signed-in nav, before Dashboard link:
<WorkspaceSelector />
```

### 2. Board Limit Enforcement
**File:** `app/api/boards/route.ts` (POST handler)
**Action:** Call `checkBoardLimit(workspaceId)` before creating a board.
```tsx
import { checkBoardLimit } from "@/lib/plan-enforcement";
// Before board creation:
if (workspaceId) {
  const check = await checkBoardLimit(workspaceId);
  if (!check.allowed) {
    return NextResponse.json({ error: check.reason }, { status: 403 });
  }
}
```

### 3. Member Limit Enforcement
**File:** `app/api/boards/[id]/members/route.ts` (POST handler)
**Action:** Call `checkMemberLimit(boardId)` before adding a member.
```tsx
import { checkMemberLimit } from "@/lib/plan-enforcement";
// Before adding member:
const check = await checkMemberLimit(boardId);
if (!check.allowed) {
  return NextResponse.json({ error: check.reason }, { status: 403 });
}
```

### 4. Prisma Schema (for coordinator)
**File:** `prisma/schema.prisma`
**Action:** Add Workspace, WorkspaceMember models, Plan enum, WorkspaceRole enum, and `workspaceId` to Board.
**Details:** See `docs/schema-changes/workspaces-billing.prisma`.

### 5. Pricing Link in Landing Page
**Action:** Add a "Pricing" link to the landing page CTA area or nav.
```tsx
<Link href="/pricing">View Pricing</Link>
```

## Stripe Webhook Setup

For local development:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Events handled:
- `checkout.session.completed` → Upgrade workspace to PRO
- `customer.subscription.updated` → Sync plan status
- `customer.subscription.deleted` → Downgrade to FREE
