import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { generateApiKey } from "@/lib/api-keys/keys";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { slug } = await ctx.params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    include: {
      members: { where: { userId: user.id }, select: { role: true } },
    },
  });

  if (!workspace) return NextResponse.json({ error: "not found" }, { status: 404 });

  const member = workspace.members[0];
  if (!member || member.role !== "ADMIN") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { workspaceId: workspace.id },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      isRevoked: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(keys);
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { slug } = await ctx.params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    include: {
      members: { where: { userId: user.id }, select: { role: true } },
    },
  });

  if (!workspace) return NextResponse.json({ error: "not found" }, { status: 404 });

  const member = workspace.members[0];
  if (!member || member.role !== "ADMIN") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { name, expiresAt } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { raw, hash, prefix } = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      name: name.trim(),
      keyHash: hash,
      keyPrefix: prefix,
      workspaceId: workspace.id,
      createdById: user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json({
    id: apiKey.id,
    name: apiKey.name,
    key: raw, // Shown ONCE
    keyPrefix: prefix,
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
  }, { status: 201 });
}
