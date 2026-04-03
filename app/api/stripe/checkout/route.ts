import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

// POST /api/stripe/checkout — Create Stripe Checkout session for upgrading to Pro
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
    { role: string; stripeCustomerId: string | null; plan: string; name: string }[]
  >(
    `SELECT wm."role", w."stripeCustomerId", w."plan", w."name"
     FROM "WorkspaceMember" wm
     JOIN "Workspace" w ON w."id" = wm."workspaceId"
     WHERE wm."workspaceId" = $1 AND wm."userId" = $2`,
    workspaceId,
    user.id
  );

  if (!membership.length || membership[0].role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (membership[0].plan === "PRO" || membership[0].plan === "ENTERPRISE") {
    return NextResponse.json(
      { error: "Workspace is already on a paid plan" },
      { status: 400 }
    );
  }

  // Create or retrieve Stripe Customer
  let customerId = membership[0].stripeCustomerId;

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      name: membership[0].name,
      metadata: { workspaceId },
    });
    customerId = customer.id;

    await prisma.$executeRawUnsafe(
      `UPDATE "Workspace" SET "stripeCustomerId" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
      customerId,
      workspaceId
    );
  }

  // Create Checkout Session
  const origin = new URL(req.url).origin;
  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "CollabBoard Pro",
            description: "Unlimited boards, unlimited members, 5GB storage",
          },
          unit_amount: 800, // $8.00
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/workspace/${encodeURIComponent(body.workspaceSlug || "")}/settings?upgraded=true`,
    cancel_url: `${origin}/pricing`,
    metadata: { workspaceId },
  });

  return NextResponse.json({ url: session.url });
}
