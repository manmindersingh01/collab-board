# Instance 1: Real-time Collaboration + Keyboard Shortcuts

## Before you start
1. Read `docs/COORDINATION.md` — it has the rules, shared file list, and architecture reference
2. Read `docs/ROADMAP.md` — full feature plan for context
3. Create and switch to branch: `git checkout -b feat/realtime`
4. Run `pnpm install` and `pnpm build` to verify baseline

## Your mission
Build real-time board updates using Server-Sent Events (SSE) and add keyboard shortcuts for power users.

## Feature 1: Real-time board updates (SSE)

### What to build
When multiple users are viewing the same board, mutations (card created, moved, updated, deleted, list added) should appear on all connected clients instantly.

### Architecture
1. **SSE endpoint**: `app/api/boards/[id]/events/route.ts`
   - GET request that returns a streaming response (`ReadableStream`)
   - Client connects when they open a board page
   - Each board has its own event stream
   - Authenticate the user and verify board membership before streaming

2. **Event broadcasting**: Create `lib/realtime.ts`
   - Use Redis pub/sub (Redis client already exists in `lib/redis.ts`) for cross-process broadcasting
   - `publishBoardEvent(boardId, event)` — publishes to Redis channel `board:{boardId}`
   - The SSE endpoint subscribes to the Redis channel and forwards events to the client
   - Event shape: `{ type: "card.created" | "card.moved" | "card.updated" | "list.created" | ..., payload: {...} }`

3. **Client hook**: Create `app/board/[id]/use-board-events.ts`
   - Custom hook `useBoardEvents(boardId, onEvent)` that:
     - Opens an EventSource to `/api/boards/[boardId]/events`
     - Parses incoming events and calls the callback
     - Auto-reconnects on disconnect
     - Cleans up on unmount
   - Export this hook. Document that `board-view.tsx` needs to import it and call it to update local state when events arrive.

4. **Emit events from existing API routes** — Create wrapper functions in `lib/realtime.ts`:
   - Do NOT modify the existing route files (they're shared)
   - Instead, create `lib/realtime-emitters.ts` with functions like:
     ```
     emitCardCreated(boardId, card)
     emitCardMoved(boardId, cardId, fromListId, toListId, position)
     emitCardUpdated(boardId, cardId, updates)
     emitListCreated(boardId, list)
     ```
   - Document in your branch README: "To integrate, add `emitCardCreated(...)` call at the end of POST /api/cards"

### Key considerations
- SSE not WebSocket — simpler, works with Next.js API routes, no extra server needed
- Use Redis pub/sub so it works across multiple server instances (production-ready)
- Handle client reconnection gracefully (EventSource does this automatically)
- Don't send events back to the user who triggered the mutation (include `userId` in the event, client skips own events)

## Feature 2: Keyboard shortcuts

### What to build
Create `app/board/[id]/use-keyboard-shortcuts.ts`:
- `C` — focus the "Add Card" input in the first visible list
- `F` — toggle a filter bar (create a placeholder component `app/board/[id]/filter-bar.tsx`)
- `/` — focus global search (if search exists) or the filter input
- `Escape` — close any open panel (card detail, members modal)
- `?` — show a keyboard shortcuts cheat sheet modal

Create `app/board/[id]/shortcuts-modal.tsx`:
- A modal listing all available shortcuts
- Neobrutalism styled (use existing CSS classes from globals.css)
- Opened with `?` key

### Key considerations
- Only active when no input/textarea is focused (don't hijack typing)
- Export the hook and modal. Document integration points.

## Files you OWN (can create/modify)
```
app/api/boards/[id]/events/route.ts    — NEW: SSE endpoint
app/board/[id]/use-board-events.ts     — NEW: client hook
app/board/[id]/use-keyboard-shortcuts.ts — NEW: keyboard hook
app/board/[id]/shortcuts-modal.tsx     — NEW: shortcuts cheat sheet
app/board/[id]/filter-bar.tsx          — NEW: placeholder filter bar
lib/realtime.ts                        — NEW: Redis pub/sub + event broadcasting
lib/realtime-emitters.ts               — NEW: emit functions for each mutation type
```

## Deliverable
A branch where:
- Opening the same board in two browser tabs shows live updates via SSE
- Keyboard shortcuts work on the board page
- A README in your branch root documents all integration points
