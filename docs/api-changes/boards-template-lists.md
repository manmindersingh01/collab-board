# API Change: POST /api/boards — Accept Custom Lists

## Current Behavior

`POST /api/boards` always creates 3 default lists: "To Do", "In Progress", "Done".

## Proposed Change

Accept an optional `lists` array in the request body:

```json
{
  "name": "My Board",
  "description": "Optional",
  "lists": ["Backlog", "To Do", "In Progress", "In Review", "Done"]
}
```

- If `lists` is provided and is a non-empty array of strings, create those lists instead of the defaults.
- If `lists` is omitted or empty, keep the current behavior (create "To Do", "In Progress", "Done").

## Why

The Board Templates feature (see `app/dashboard/board-template-picker.tsx` and `lib/board-templates.ts`) allows users to choose a pre-defined board configuration when creating a new board. Each template specifies a different set of lists. The `lists` array is passed through from the template selection to the board creation API.

## Where to Change

File: `app/api/boards/route.ts`, in the `POST` handler.

Replace the hardcoded `createMany` call:

```typescript
// Before:
await tx.list.createMany({
  data: [
    { boardId: newBoard.id, title: "To Do", position: 1.0 },
    { boardId: newBoard.id, title: "In Progress", position: 2.0 },
    { boardId: newBoard.id, title: "Done", position: 3.0 },
  ],
});

// After:
const listNames = Array.isArray(body.lists) && body.lists.length > 0
  ? body.lists
  : ["To Do", "In Progress", "Done"];

await tx.list.createMany({
  data: listNames.map((title: string, i: number) => ({
    boardId: newBoard.id,
    title,
    position: i + 1.0,
  })),
});
```

## Integration

The `BoardTemplatePicker` component passes the selected template's `lists` array to the `POST /api/boards` request body. See `app/dashboard/board-template-picker.tsx` for the component and integration notes in the branch README.
