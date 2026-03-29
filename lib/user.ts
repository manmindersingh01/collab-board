import { auth } from "@clerk/nextjs/server";
import prisma from "./prisma";
import { error } from "console";

export async function getDbUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return error("user is not authenticated with the clerk");
  }
  const user = await prisma.user.findUnique({
    where: { clerkId },
  });
  return user;
}
