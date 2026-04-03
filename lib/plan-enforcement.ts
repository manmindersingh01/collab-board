import prisma from "./prisma";
import { PLAN_LIMITS, type PlanType } from "./plan-limits";

/**
 * Check if a workspace can create more boards.
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */
export async function checkBoardLimit(workspaceId: string): Promise<
  { allowed: true } | { allowed: false; reason: string }
> {
  const workspace = await prisma.$queryRawUnsafe<
    { plan: PlanType; boardCount: number }[]
  >(
    `SELECT w."plan", COUNT(b."id")::int as "boardCount"
     FROM "Workspace" w
     LEFT JOIN "Board" b ON b."workspaceId" = w."id" AND b."isArchived" = false
     WHERE w."id" = $1
     GROUP BY w."id"`,
    workspaceId
  );

  if (!workspace.length) {
    return { allowed: false, reason: "Workspace not found" };
  }

  const { plan, boardCount } = workspace[0];
  const limit = PLAN_LIMITS[plan].boards;

  if (limit === -1) return { allowed: true };
  if (boardCount >= limit) {
    return {
      allowed: false,
      reason: `Free plan is limited to ${limit} boards. Upgrade to Pro for unlimited boards.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if a board can add more members based on workspace plan.
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */
export async function checkMemberLimit(boardId: string): Promise<
  { allowed: true } | { allowed: false; reason: string }
> {
  const result = await prisma.$queryRawUnsafe<
    { plan: PlanType; memberCount: number }[]
  >(
    `SELECT w."plan", COUNT(bm."userId")::int as "memberCount"
     FROM "Board" b
     LEFT JOIN "Workspace" w ON w."id" = b."workspaceId"
     LEFT JOIN "BoardMember" bm ON bm."boardId" = b."id"
     WHERE b."id" = $1
     GROUP BY w."plan"`,
    boardId
  );

  if (!result.length) {
    return { allowed: false, reason: "Board not found" };
  }

  const { plan, memberCount } = result[0];

  // If board isn't in a workspace, allow (legacy boards)
  if (!plan) return { allowed: true };

  const limit = PLAN_LIMITS[plan].membersPerBoard;

  if (limit === -1) return { allowed: true };
  if (memberCount >= limit) {
    return {
      allowed: false,
      reason: `Free plan is limited to ${limit} members per board. Upgrade to Pro for unlimited members.`,
    };
  }

  return { allowed: true };
}
