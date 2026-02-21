import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function getSession() {
  const token = cookies().get("clicks_token")?.value;
  if (!token) return null;
  try {
    const payload = await verifyToken(token);
    return payload;
  } catch {
    return null;
  }
}

export async function requireRole(roles: Array<"USER"|"VENUE"|"ADMIN">) {
  const session = await getSession();
  if (!session || !roles.includes(session.role)) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }
  return { ok: true as const, session };
}

export { prisma };
