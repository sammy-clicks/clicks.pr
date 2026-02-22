import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");

export default async function Home() {
  const token = cookies().get("clicks_token")?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      const role = (payload as any).role as string | undefined;
      if (role === "ADMIN") redirect("/admin/analytics");
      else if (role === "VENUE") redirect("/v/dashboard");
      else redirect("/u/zones");
    } catch { /* invalid token — fall through to /role */ }
  }
  redirect("/role");
}
