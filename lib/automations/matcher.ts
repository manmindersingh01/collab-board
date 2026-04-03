export interface TriggerConditions {
  fromList?: string;
  toList?: string;
  priority?: string;
  field?: string;
}

export interface MatchContext {
  fromListId?: string;
  toListId?: string;
  priority?: string;
  field?: string;
}

export function matchesConditions(
  conditions: TriggerConditions | undefined,
  context: MatchContext,
): boolean {
  if (!conditions) return true;

  const checks: [string | undefined, string | undefined][] = [
    [conditions.fromList, context.fromListId],
    [conditions.toList, context.toListId],
    [conditions.priority, context.priority],
    [conditions.field, context.field],
  ];

  for (const [expected, actual] of checks) {
    if (expected !== undefined && expected !== actual) {
      return false;
    }
  }

  return true;
}
