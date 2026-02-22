import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = session.sub;
  const conv = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      user1: { select: { id: true, username: true, avatarUrl: true } },
      user2: { select: { id: true, username: true, avatarUrl: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 100 },
    },
  });

  if (!conv || (conv.user1Id !== uid && conv.user2Id !== uid))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Mark unread messages as read
  await prisma.directMessage.updateMany({
    where: { conversationId: params.id, readAt: null, senderId: { not: uid } },
    data: { readAt: new Date() },
  });

  const other = conv.user1Id === uid ? conv.user2 : conv.user1;
  return NextResponse.json({ conversation: conv, other });
}

const SendSchema = z.object({ body: z.string().min(1).max(1000) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = session.sub;
  const conv = await prisma.conversation.findUnique({ where: { id: params.id } });
  if (!conv || (conv.user1Id !== uid && conv.user2Id !== uid))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { body } = SendSchema.parse(await req.json());

  const msg = await prisma.directMessage.create({
    data: { conversationId: params.id, senderId: uid, body },
  });

  await prisma.conversation.update({
    where: { id: params.id },
    data: { lastAt: new Date() },
  });

  return NextResponse.json({ ok: true, messageId: msg.id });
}
