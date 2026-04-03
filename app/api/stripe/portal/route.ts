import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

// POST /api/stripe/portal — Create Stripe Customer Portal session
export async function POST(req: Request) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { workspaceId } = body;

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  // Verify user is ADMIN of workspace
  const membership = await prisma.$queryRawUnsafe<
    { role: string; stripeCustomerId: string | null }[]
  >(
    `SELECT wm."role", w."stripeCustomerId"
     FROM "WorkspaceMember" wm
     JOIN "Workspace" w ON w."id" = wm."workspaceId"
     WHERE wm."workspaceId" = $1 AND wm."userId" = $2`,
    workspaceId,
    user.id
  );

  if (!membership.length || membership[0].role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!membership[0].stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account. Upgrade to Pro first." },
      { status: 400 }
    );
  }

  const origin = new URL(req.url).origin;
  const session = await getStripe().billingPortal.sessions.create({
    customer: membership[0].stripeCustomerId,
    return_url: `${origin}/workspace/${encodeURIComponent(body.workspaceSlug || "")}/settings`,
  });

  return NextResponse.json({ url: session.url });
}
