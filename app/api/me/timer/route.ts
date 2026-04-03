import { getDbUser } from "@/lib/user";
import { getActiveTimer } from "@/lib/time-tracking/timer";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const timer = await getActiveTimer(user.id);

  return NextResponse.json(timer);
}
