-- Setup script for Workspaces + Billing tables (Instance 5)
-- Run this against the PostgreSQL database to create the required tables.

-- Plan enum
DO $$ BEGIN
  CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- WorkspaceRole enum
DO $$ BEGIN
  CREATE TYPE "WorkspaceRole" AS ENUM ('ADMIN', 'MEMBER', 'GUEST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Workspace table
CREATE TABLE IF NOT EXISTS "Workspace" (
  "id"                    TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name"                  TEXT NOT NULL,
  "slug"                  TEXT NOT NULL,
  "logoUrl"               TEXT,
  "plan"                  "Plan" NOT NULL DEFAULT 'FREE',
  "stripeCustomerId"      TEXT,
  "stripeSubscriptionId"  TEXT,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_slug_key" ON "Workspace"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_stripeCustomerId_key" ON "Workspace"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_stripeSubscriptionId_key" ON "Workspace"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "Workspace_slug_idx" ON "Workspace"("slug");

-- WorkspaceMember table
CREATE TABLE IF NOT EXISTS "WorkspaceMember" (
  "role"          "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
  "joinedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "workspaceId"   TEXT NOT NULL,
  "userId"        TEXT NOT NULL,

  CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("workspaceId", "userId"),
  CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE,
  CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Add workspaceId to Board (nullable, for gradual migration)
DO $$ BEGIN
  ALTER TABLE "Board" ADD COLUMN "workspaceId" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Foreign key from Board to Workspace
DO $$ BEGIN
  ALTER TABLE "Board" ADD CONSTRAINT "Board_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Board_workspaceId_idx" ON "Board"("workspaceId");
