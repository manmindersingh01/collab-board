# CollabBoard — Production SaaS Roadmap

## Current State (what's built)

- Neobrutalism UI with Tailwind v4
- Dashboard with board CRUD, search, create modal
- Kanban board with drag-and-drop (dnd-kit, fractional indexing, optimistic updates)
- Card detail side panel: inline editing (title, description, priority, labels, due date, assignee)
- Markdown description with react-markdown preview
- Comments system with optimistic add
- RBAC: Owner / Editor / Viewer (enforced at API + UI level)
- Board members management: invite by email, role change, remove
- Activity log: per-board event feed
- "My Tasks" page: cards assigned to current user across all boards
- "Mark as Done" with custom completion targets (completionListId per card)
- Owner can add new lists to boards
- Auth: Clerk with webhook sync
- DB: PostgreSQL + pgvector, Prisma 7, Redis client ready

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- React 19, TypeScript
- Tailwind CSS v4 (neobrutalism design system)
- Prisma 7 with pg adapter
- PostgreSQL + pgvector
- Clerk auth
- @dnd-kit/core + @dnd-kit/sortable
- react-markdown
- pnpm

---

## Tier 1 — Must-Have

### 1. Real-time collaboration (SSE)
Server-Sent Events for live board updates. When user A moves a card, user B sees it instantly without refreshing. SSE endpoint per board, API routes broadcast mutations.

### 2. Notifications (in-app + email)
Notification model in DB. Trigger on: assignment, comment, due date approaching, role change. Bell icon in header with unread count. Optional email via Resend/SendGrid.

### 3. File attachments on cards
S3/R2 storage with presigned upload URLs. Attachment model linked to Card. Upload UI in card detail panel. Image preview, file download links.

### 4. Global search
Search cards by title/description/label across all boards the user has access to. Full-text search with PostgreSQL `tsvector` + optional pgvector semantic search using the embeddings column.

### 5. Due date reminders
Cron job (or Next.js API route triggered by external cron) that scans for cards with due dates approaching (1 day) or overdue. Creates in-app notifications and optionally sends emails.

### 6. Per-card activity history
Show activity log entries filtered to a specific card in the card detail panel. Already logging card.created, card.moved, card.updated — just need a UI section + filtered API.

### 7. Archive & delete boards/cards
Board.isArchived already exists in schema. Add archive/restore UI on dashboard. Add archive for cards. Soft delete pattern — archived items hidden by default, restorable.

---

## Tier 2 — Competitive Differentiators

### 8. Multiple views (Table, Calendar, List)
Table view: spreadsheet-like grid of all cards. Calendar view: cards plotted by due date. List view: flat sorted list. Selectable via tabs on the board page.

### 9. Board filters & grouping
Filter bar on the board: by assignee, priority, label, due date range. Group cards by priority or assignee within lists. Persist filter state in URL params.

### 10. Card templates
Predefined templates per board (Bug Report, Feature Request, etc.) with pre-filled fields. Template selector in the "Add Card" input.

### 11. Swimlanes
Horizontal rows within the Kanban board, grouping cards by a field (priority, assignee, label). Each swimlane contains its own set of list columns.

### 12. WIP limits
Max cards per list, configurable by owner. Visual warning when approaching limit, block when at limit. Core Kanban principle.

### 13. Board templates
Pre-built board configurations: "Engineering Sprint", "Marketing Campaign", "Product Launch". Applied when creating a new board.

### 14. Keyboard shortcuts
C = create card, F = filter, / = search, Escape = close panels, arrow keys = navigate cards. Command palette (Cmd+K) for power users.

---

## Tier 3 — Enterprise & Revenue

### 15. Workspaces / Organizations
Multi-tenant: Workspace model wrapping boards and members. Workspace-level roles (Admin, Member, Guest). All boards belong to a workspace.

### 16. Stripe billing
Free tier (3 boards, 2 members per board), Pro ($8/user/month, unlimited), Enterprise (custom). Stripe Checkout, customer portal, webhook for subscription events.

### 17. SSO (SAML/OIDC)
Enterprise SSO via Clerk's enterprise features. SAML connection per workspace.

### 18. Workspace-level RBAC
Workspace Admin, Member, Guest roles separate from board-level Owner/Editor/Viewer. Workspace admins can manage all boards.

### 19. Time tracking
Start/stop timer on cards, manual hour logging. Time reports per user, per board, per date range. Essential for agencies billing by hour.

### 20. Automations
Rule engine: trigger (card moved, field changed, due date reached) + action (notify, assign, change field, move card). UI builder for rules.

### 21. Analytics dashboard
Cycle time, lead time, throughput, cards by status/priority, burndown. Date range selector. Exportable as CSV/PDF.

### 22. Public API + webhooks
REST API with API key auth for external integrations. Outgoing webhooks for card/board events. API docs page.

### 23. Integrations (Slack, GitHub, Google Calendar)
Slack: post updates to a channel. GitHub: link PRs to cards, auto-move on merge. Google Calendar: sync due dates.

### 24. Import/export
Import from Trello (JSON), Jira (CSV), generic CSV. Export boards as CSV/JSON. Reduces switching friction.

---

## Tier 4 — AI-Powered

### 25. Semantic search (pgvector)
Generate embeddings on card create/update. Similarity search: "find cards about authentication" returns related cards even without exact keyword match.

### 26. AI auto-categorization
On card creation, suggest labels and priority from title/description using LLM. User confirms or dismisses.

### 27. AI sprint summary
Weekly digest: cards completed, overdue, blockers, team velocity. Generated by LLM from activity log data. Sent via email or Slack.

### 28. Duplicate detection
Before creating a card, check embeddings similarity. Warn if a similar card already exists.
