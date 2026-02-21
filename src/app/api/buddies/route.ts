import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [accepted, pending] = await Promise.all([
    // Accepted buddies (either direction)
    prisma.buddy.findMany({
      where: {
        OR: [
          { senderId: session.sub, status: "ACCEPTED" },
          { receiverId: session.sub, status: "ACCEPTED" },
        ],
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, ghostMode: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, ghostMode: true } },
      },
    }),
    // Pending requests received by me
    prisma.buddy.findMany({
      where: { receiverId: session.sub, status: "PENDING" },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    }),
  ]);

  const buddies = accepted.map(b => {
    const friend = b.senderId === session.sub ? b.receiver : b.sender;
    return { buddyId: b.id, friendId: friend.id, name: `${friend.firstName} ${friend.lastName}`, ghostMode: friend.ghostMode };
  });

  const requests = pending.map(b => ({
    buddyId: b.id,
    fromId: b.sender.id,
    name: `${b.sender.firstName} ${b.sender.lastName}`,
  }));

  return NextResponse.json({ buddies, requests });
}

const SendSchema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = SendSchema.parse(await req.json());
  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (target.id === session.sub) return NextResponse.json({ error: "Cannot add yourself." }, { status: 400 });

  const existing = await prisma.buddy.findFirst({
    where: {
      OR: [
        { senderId: session.sub, receiverId: target.id },
        { senderId: target.id, receiverId: session.sub },
      ],
    },
  });
  if (existing) return NextResponse.json({ error: "Request already exists." }, { status: 409 });

  await prisma.buddy.create({ data: { senderId: session.sub, receiverId: target.id } });
  return NextResponse.json({ ok: true });
}

const PatchSchema = z.object({ buddyId: z.string(), action: z.enum(["accept", "block"]) });

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { buddyId, action } = PatchSchema.parse(await req.json());
  const buddy = await prisma.buddy.findUnique({ where: { id: buddyId } });
  if (!buddy || buddy.receiverId !== session.sub)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.buddy.update({
    where: { id: buddyId },
    data: { status: action === "accept" ? "ACCEPTED" : "BLOCKED" },
  });
  return NextResponse.json({ ok: true });
}
