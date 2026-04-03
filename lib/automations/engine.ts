import prisma from "@/lib/prisma";
import { matchesConditions } from "./matcher";
import {
  executeSetField,
  executeMoveToList,
  executeAssign,
  executeUnassign,
  executeAddLabel,
  executeRemoveLabel,
  executeNotify,
  executeAddComment,
} from "./actions";

export type TriggerEvent =
  | "card.created"
  | "card.moved"
  | "card.updated"
  | "card.completed"
  | "due.approaching"
  | "due.overdue";

interface ActionConfig {
  type: string;
  field?: string;
  value?: unknown;
  listId?: string;
  userId?: string;
  label?: string;
  message?: string;
}

interface TriggerConfig {
  event: string;
  conditions?: {
    fromList?: string;
    toList?: string;
    priority?: string;
    field?: string;
  };
}

export interface AutomationContext {
  cardId: string;
  userId: string;
  fromListId?: string;
  toListId?: string;
  changedField?: string;
  changedValue?: unknown;
}

export async function runAutomations(
  boardId: string,
  event: TriggerEvent,
  context: AutomationContext,
): Promise<void> {
  const automations = await prisma.automation.findMany({
    where: { boardId, isActive: true },
  });

  for (const automation of automations) {
    const trigger = automation.trigger as unknown as TriggerConfig;

    if (trigger.event !== event) continue;

    const matched = matchesConditions(trigger.conditions, {
      fromListId: context.fromListId,
      toListId: context.toListId,
      priority: context.changedField === "priority" ? String(context.changedValue) : undefined,
      field: context.changedField,
    });

    if (!matched) continue;

    const actions = automation.actions as unknown as ActionConfig[];
    for (const action of actions) {
      try {
        await executeAction(action, context);
      } catch (e) {
        console.error(
          `Automation "${automation.name}" action ${action.type} failed:`,
          e,
        );
      }
    }
  }
}

async function executeAction(
  action: ActionConfig,
  context: AutomationContext,
): Promise<void> {
  switch (action.type) {
    case "set_field":
      await executeSetField(context.cardId, action.field!, action.value);
      break;
    case "move_to_list":
      await executeMoveToList(context.cardId, action.listId!);
      break;
    case "assign":
      await executeAssign(context.cardId, action.userId!);
      break;
    case "unassign":
      await executeUnassign(context.cardId);
      break;
    case "add_label":
      await executeAddLabel(context.cardId, action.label!);
      break;
    case "remove_label":
      await executeRemoveLabel(context.cardId, action.label!);
      break;
    case "notify":
      await executeNotify(
        action.userId!,
        action.message!,
      );
      break;
    case "add_comment":
      await executeAddComment(context.cardId, context.userId, action.message!);
      break;
  }
}
