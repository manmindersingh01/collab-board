import prisma from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

// POST /api/webhooks/stripe — Stripe webhook handler
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const workspaceId = session.metadata?.workspaceId;
      if (workspaceId && session.subscription) {
        await prisma.$executeRawUnsafe(
          `UPDATE "Workspace"
           SET "plan" = 'PRO'::"Plan",
               "stripeSubscriptionId" = $1,
               "updatedAt" = NOW()
           WHERE "id" = $2`,
          String(session.subscription),
          workspaceId
        );
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;

      // Map Stripe subscription status to plan
      const isActive =
        subscription.status === "active" || subscription.status === "trialing";

      await prisma.$executeRawUnsafe(
        `UPDATE "Workspace"
         SET "plan" = $1::"Plan",
             "updatedAt" = NOW()
         WHERE "stripeCustomerId" = $2`,
        isActive ? "PRO" : "FREE",
        customerId
      );
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;

      await prisma.$executeRawUnsafe(
        `UPDATE "Workspace"
         SET "plan" = 'FREE'::"Plan",
             "stripeSubscriptionId" = NULL,
             "updatedAt" = NOW()
         WHERE "stripeCustomerId" = $1`,
        customerId
      );
      break;
    }
  }

  return NextResponse.json({ received: true });
}
