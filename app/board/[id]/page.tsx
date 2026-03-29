import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import BoardView from "./board-view";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getDbUser();

  if (!user) {
    redirect("/dashboard");
  }

  // Single query: board + nested lists/cards + ALL members (with user info)
  const board = await prisma.board.findUnique({
    where: { id },
    include: {
      list: {
        orderBy: { position: "asc" },
        include: {
          card: {
            orderBy: { position: "asc" },
            include: {
              assignee: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          },
        },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!board) {
    redirect("/dashboard");
  }

  // Auth: find current user in the members array
  const currentMembership = board.members.find((m) => m.userId === user.id);
  if (!currentMembership) {
    redirect("/dashboard");
  }

  const userRole = currentMembership.role;

  return (
    <BoardView board={board} userRole={userRole} currentUserId={user.id} />
  );
}
