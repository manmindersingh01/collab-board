# Instance 4: Multiple Views (Table, Calendar) + Card Templates + Board Templates

## Before you start
1. Read `docs/COORDINATION.md` — it has the rules, shared file list, and architecture reference
2. Read `docs/ROADMAP.md` — full feature plan for context
3. Create and switch to branch: `git checkout -b feat/views-templates`
4. Run `pnpm install` and `pnpm build` to verify baseline

## Your mission
Build alternative board views (Table and Calendar), a card template system, and board templates for quick setup.

## Feature 1: Table view

### Component: `app/board/[id]/views/table-view.tsx`
A spreadsheet-like view of all cards on the board, across all lists.

Columns:
- Title (text, editable inline — click to edit, blur to save)
- List (dropdown — moving cards between lists)
- Priority (dropdown selector)
- Assignee (dropdown of board members)
- Due Date (date picker)
- Labels (tag chips)
- Created (relative timestamp, read-only)

Features:
- Sortable by any column (click column header to toggle asc/desc)
- All cells are inline-editable (for editors/owners)
- Viewers see a read-only table
- Use the existing PATCH /api/cards/[id] endpoint for saves
- For list changes, use PATCH /api/cards/[id]/move endpoint
- Neobrutalism styled: 2px borders on table cells, neo-yellow header row, shadow on the table container

### Component: `app/board/[id]/views/view-switcher.tsx`
A tab bar / toggle group for switching between views:
- Board (Kanban) — default
- Table
- Calendar

Stores the active view in URL param: `?view=board|table|calendar`
Document integration: "Add `<ViewSwitcher />` to the board header area in board-view.tsx, and conditionally render the active view"

## Feature 2: Calendar view

### Install dependency
`pnpm add date-fns` for date utilities (week boundaries, formatting)

### Component: `app/board/[id]/views/calendar-view.tsx`
A monthly calendar grid showing cards on their due dates.

Layout:
- Month/week navigation header with prev/next buttons and "Today" button
- 7-column grid (Mon-Sun)
- Each day cell shows cards due on that date as small chips (title + priority dot)
- Days with no cards show empty
- Click a card chip → open card detail panel (export an `onCardClick` prop)
- Cards without due dates shown in a sidebar: "Unscheduled (N)"

Features:
- Current day highlighted with neo-yellow background
- Overdue cards (past dates) have red text
- Drag cards between dates to change their due date (optional — nice-to-have, use native HTML drag or dnd-kit)
- Neobrutalism styled: thick grid borders, bold day numbers, shadow on the calendar container

## Feature 3: Card templates

### Schema (document in docs/schema-changes/views-templates.prisma)
```prisma
model CardTemplate {
  id          String   @id @default(cuid())
  name        String
  description String?
  priority    Priority @default(NONE)
  labels      String[] @default([])
  boardId     String
  board       Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())

  @@index([boardId])
}
```

Use raw SQL to create the table (same pattern as notifications instance — can't modify shared schema).

### API Routes
1. `GET /api/boards/[id]/templates` — List all card templates for a board
2. `POST /api/boards/[id]/templates` — Create a template (owner/editor). Body: `{ name, description?, priority?, labels? }`
3. `DELETE /api/boards/[id]/templates/[templateId]` — Delete a template (owner only)

### UI: Template selector
Create `app/board/[id]/template-selector.tsx`:
- A dropdown/modal that appears when creating a card
- Shows available templates for the board
- Selecting a template pre-fills the card creation with the template's fields
- "Manage Templates" link at the bottom (opens a small management view)
- Document integration: "Add template selector to the AddCardInput component in board-view.tsx"

### UI: Template manager
Create `app/board/[id]/template-manager.tsx`:
- Modal for creating/editing/deleting card templates
- Form: name, description, priority picker, labels input
- List of existing templates with edit/delete actions
- Owner-only access

## Feature 4: Board templates

### What to build
Pre-defined board configurations that users can choose when creating a new board.

### Templates data (hardcoded, no DB needed)
Create `lib/board-templates.ts`:
```typescript
export const BOARD_TEMPLATES = [
  {
    id: "engineering",
    name: "Engineering Sprint",
    description: "Agile sprint board for software teams",
    lists: ["Backlog", "To Do", "In Progress", "In Review", "Done"],
    icon: "code",
  },
  {
    id: "marketing",
    name: "Marketing Campaign",
    description: "Plan and track marketing campaigns",
    lists: ["Ideas", "Planning", "In Progress", "Review", "Published"],
    icon: "megaphone",
  },
  {
    id: "product",
    name: "Product Launch",
    description: "Coordinate product launch activities",
    lists: ["Research", "Design", "Development", "Testing", "Launch"],
    icon: "rocket",
  },
  {
    id: "hiring",
    name: "Hiring Pipeline",
    description: "Track candidates through hiring stages",
    lists: ["Applied", "Phone Screen", "Interview", "Offer", "Hired"],
    icon: "users",
  },
  {
    id: "blank",
    name: "Blank Board",
    description: "Start from scratch with default lists",
    lists: ["To Do", "In Progress", "Done"],
    icon: "plus",
  },
];
```

### UI: Template picker in create board modal
Create `app/dashboard/board-template-picker.tsx`:
- A grid of template cards shown in the "Create Board" modal
- Each card shows: icon, name, description, list preview
- Selecting a template sets the board name and remembers which lists to create
- Document integration: "Add `<BoardTemplatePicker />` to the CreateBoardModal in dashboard/page.tsx. Pass selected template's lists array to the POST /api/boards request."

### API change needed
The existing POST /api/boards always creates 3 default lists (To Do, In Progress, Done). Document that it needs to accept an optional `lists` array in the request body: `{ name, description, lists?: string[] }`. If provided, create those lists instead of the defaults.
- Create `docs/api-changes/boards-template-lists.md` documenting this change.

## Files you OWN (can create/modify)
```
app/board/[id]/views/table-view.tsx        — NEW: table view
app/board/[id]/views/calendar-view.tsx     — NEW: calendar view
app/board/[id]/views/view-switcher.tsx     — NEW: view toggle
app/board/[id]/template-selector.tsx       — NEW: template picker for card creation
app/board/[id]/template-manager.tsx        — NEW: CRUD for card templates
app/api/boards/[id]/templates/route.ts     — NEW: GET/POST card templates
app/api/boards/[id]/templates/[templateId]/route.ts — NEW: DELETE template
app/dashboard/board-template-picker.tsx    — NEW: board template grid
lib/board-templates.ts                     — NEW: template definitions
docs/schema-changes/views-templates.prisma — NEW: schema docs
docs/api-changes/boards-template-lists.md  — NEW: API change doc
```

## Dependencies to install
- `date-fns` — for calendar date utilities

## Deliverable
A branch where:
- Table view shows all cards in a sortable, inline-editable grid
- Calendar view shows cards on a monthly grid by due date
- View switcher component is ready for integration
- Card templates can be created and used (via standalone management UI)
- Board templates are defined and a picker component exists
- All integration points documented in branch README
