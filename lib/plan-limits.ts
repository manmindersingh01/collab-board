export const PLAN_LIMITS = {
  FREE: { boards: 3, membersPerBoard: 5, fileStorageMb: 100 },
  PRO: { boards: -1, membersPerBoard: -1, fileStorageMb: 5000 }, // -1 = unlimited
  ENTERPRISE: { boards: -1, membersPerBoard: -1, fileStorageMb: 50000 },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;
