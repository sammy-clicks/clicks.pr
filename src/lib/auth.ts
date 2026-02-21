import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");

export const TokenPayloadSchema = z.object({
  sub: z.string(),
  role: z.enum(["USER", "VENUE", "ADMIN"]),
});

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;

export async function signToken(payload: TokenPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  return TokenPayloadSchema.parse(payload);
}
