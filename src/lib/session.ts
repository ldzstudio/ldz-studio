// Usado pelo middleware (edge) e pelo servidor: só depende de "jose".
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ldz_admin";

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET ausente ou curto demais");
  return new TextEncoder().encode(s);
}

export async function signSession(adminId: number, email: string) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(adminId))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key());
}

export async function verifySession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { id: Number(payload.sub), email: String(payload.email) };
  } catch {
    return null;
  }
}
