import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = session.sub;

  // All DM conversations this user is part of
  const convs = await prisma.conversation.findMany({
    where: { OR: [{ user1Id: uid }, { user2Id: uid }] },
    include: {
      user1: { select: { id: true, username: true, avatarUrl: true } },
      user2: { select: { id: true, username: true, avatarUrl: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { lastAt: "desc" },
  });

  // Active support cases with any admin replies
  const cases = await prisma.supportCase.findMany({
    where: { userId: uid },
    include: {
      order: { select: { orderNumber: true, venue: { select: { name: true } } } },
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ conversations: convs, cases });
}

const NewConvSchema = z.object({ buddyId: z.string() });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = session.sub;
  const { buddyId } = NewConvSchema.parse(await req.json());

  // Verify they are buddies
  const friendship = await prisma.buddy.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { senderId: uid, receiverId: buddyId },
        { senderId: buddyId, receiverId: uid },
      ],
    },
  });
  if (!friendship)
    return NextResponse.json({ error: "You can only message your buddies." }, { status: 403 });

  // Sorted pair to maintain unique constraint
  const [u1, u2] = [uid, buddyId].sort();

  const conv = await prisma.conversation.upsert({
    where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
    create: { user1Id: u1, user2Id: u2 },
    update: {},
  });

  return NextResponse.json({ conversationId: conv.id });
}
