# Instance 3: Global Search + Board Filters + Archive/Delete

## Before you start
1. Read `docs/COORDINATION.md` — it has the rules, shared file list, and architecture reference
2. Read `docs/ROADMAP.md` — full feature plan for context
3. Create and switch to branch: `git checkout -b feat/search-filters-archive`
4. Run `pnpm install` and `pnpm build` to verify baseline

## Your mission
Build global search across all boards, filterable board views, and archive/delete functionality for boards and cards.

## Feature 1: Global search

### API Route: `GET /api/search?q=<query>`
- Search cards by title and description across all boards the user is a member of
- Use PostgreSQL full-text search (`to_tsvector` / `to_tsquery`) via raw SQL
- Return results grouped by board, with card title, description snippet, board name, list name
- Limit to 20 results
- Authorization: only return cards from boards where the user is a member

Example raw SQL approach:
```sql
SELECT c.id, c.title, c.description, c.priority, c."dueDate",
       l.title as "listTitle", b.id as "boardId", b.name as "boardName"
FROM "Card" c
JOIN "List" l ON c."listId" = l.id
JOIN "Board" b ON l."boardId" = b.id
JOIN "BoardMember" bm ON b.id = bm."boardId"
WHERE bm."userId" = $1
  AND (c.title ILIKE '%' || $2 || '%' OR c.description ILIKE '%' || $2 || '%')
ORDER BY c."updatedAt" DESC
LIMIT 20
```

### UI: Search page `app/search/page.tsx`
- Full page with search input at top
- Results listed below, each showing: card title, description snippet (truncated), board name, list name, priority badge
- Click result → navigate to `/board/[boardId]?card=[cardId]`
- Empty state: "Search across all your boards"
- No results: "No cards matching '[query]'"
- Loading skeleton while searching
- Debounce search input (300ms)

### UI: Command palette `app/components/command-palette.tsx`
- `Cmd+K` / `Ctrl+K` opens a modal with search input
- Type-ahead search results (same API)
- Arrow keys to navigate results, Enter to select
- Escape to close
- Neobrutalism styled (neo-card, thick border, shadow)
- Document integration: "Add `<CommandPalette />` to `app/layout.tsx` inside ClerkProvider"

## Feature 2: Board filters

### Component: `app/board/[id]/board-filters.tsx`
A filter bar component that sits between the board header and the lists area.

Filters:
- **Assignee**: dropdown of board members, multi-select
- **Priority**: checkboxes for NONE/LOW/MEDIUM/HIGH/URGENT
- **Labels**: text chips, click to toggle
- **Due date**: "Overdue", "Due this week", "Due this month", "No date"

The component:
- Accepts the full list of cards and members as props
- Returns the filter state: `{ assigneeIds: string[], priorities: string[], labels: string[], dueDateFilter: string | null }`
- Does NOT filter the cards itself — it exports the filter state
- Document integration: "Import BoardFilters into board-view.tsx, render between header and DndContext, use filter state to filter cards in each ListColumn"

Store filter state in URL search params (`?assignee=id1,id2&priority=HIGH,URGENT`) so filters persist on refresh and are shareable.

### Visual filter indicators
- Active filter count badge on the filter bar
- "Clear all" button when any filter is active
- Faded/dimmed cards that don't match filters (rather than hiding them — preserves Kanban context)

## Feature 3: Archive & delete

### API Routes

1. `PATCH /api/boards/[id]/archive` — Toggle `isArchived` on a board. Owner only.
   ```typescript
   await prisma.board.update({ where: { id }, data: { isArchived: !board.isArchived } });
   ```

2. `PATCH /api/cards/[id]/archive` — Archive/unarchive a card. Editor+ only.
   - Need to add `isArchived Boolean @default(false)` to Card model
   - Document in `docs/schema-changes/search-filters-archive.prisma`
   - Use raw SQL: `UPDATE "Card" SET "isArchived" = NOT "isArchived" WHERE "id" = $1`

3. `DELETE /api/boards/[id]` — Permanently delete a board. Owner only. Cascades to lists, cards, comments, activity.

4. `DELETE /api/cards/[id]` — Permanently delete a card. Owner only. Cascades to comments.

### UI: Dashboard archive section
Create `app/dashboard/archived-boards.tsx`:
- A collapsible section at the bottom of the dashboard: "Archived Boards (N)"
- Click to expand and see archived boards in a grid
- Each archived board card has "Restore" and "Delete permanently" buttons
- "Delete permanently" requires a confirmation dialog

### UI: Card archive
Create `app/board/[id]/card-archive-menu.tsx`:
- In the card detail panel header, add a "..." menu with "Archive card" and "Delete card" options
- Archived cards are hidden from the board by default
- Add a toggle in the board header: "Show archived cards" — displays them with a dimmed/strikethrough style
- Document integration points for card-detail.tsx and board-view.tsx

## Files you OWN (can create/modify)
```
app/api/search/route.ts                        — NEW: global search
app/api/boards/[id]/archive/route.ts           — NEW: toggle board archive
app/api/cards/[id]/archive/route.ts            — NEW: toggle card archive
app/search/page.tsx                            — NEW: search results page
app/search/loading.tsx                         — NEW: search loading skeleton
app/components/command-palette.tsx              — NEW: Cmd+K search modal
app/board/[id]/board-filters.tsx               — NEW: filter bar component
app/dashboard/archived-boards.tsx              — NEW: archived boards section
app/board/[id]/card-archive-menu.tsx           — NEW: card archive/delete menu
docs/schema-changes/search-filters-archive.prisma — NEW: schema docs
```

## Deliverable
A branch where:
- Global search works across all boards with a search page and Cmd+K command palette
- Board filter bar component is built and documented for integration
- Archive/restore works for both boards and cards
- Permanent delete with confirmation dialogs
- All integration points documented in branch README
