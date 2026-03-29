import { Webhook } from "svix";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET!;
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  const body = await req.json();

  const wh = new Webhook(SIGNING_SECRET);
  let evt: any;
  try {
    evt = wh.verify(JSON.stringify(body), {
      "svix-id": svixId!,
      "svix-timestamp": svixTimestamp!,
      "svix-signature": svixSignature!,
    });
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // Move the logic OUTSIDE the try/catch
  const eventType = evt.type;
  const data = evt.data;

  if (eventType === "user.created" || eventType === "user.updated") {
    await prisma.user.upsert({
      where: { clerkId: data.id },
      update: {
        email: data.email_addresses[0]?.email_address,
        name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
        avatarUrl: data.image_url,
      },
      create: {
        clerkId: data.id,
        email: data.email_addresses[0]?.email_address ?? "",
        name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
        avatarUrl: data.image_url,
      },
    });
  }

  if (eventType === "user.deleted") {
    await prisma.user.deleteMany({
      where: { clerkId: data.id },
    });
  }

  return new Response("OK", { status: 200 }); // this was missing
}
