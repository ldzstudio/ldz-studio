// Usado pelo middleware (edge) e pelo servidor: só depende de "jose".
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ldz_admin";
export const CUSTOMER_COOKIE = "ldz_cliente";

type Role = "admin" | "customer";

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET ausente ou curto demais");
  return new TextEncoder().encode(s);
}

export async function signSession(id: number, email: string, role: Role = "admin") {
  return new SignJWT({ email, role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(id))
    .setIssuedAt()
    .setExpirationTime(role === "admin" ? "7d" : "30d")
    .sign(key());
}

export async function verifySession(token: string | undefined, role: Role = "admin") {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    if (payload.role !== role) return null;
    return { id: Number(payload.sub), email: String(payload.email) };
  } catch {
    return null;
  }
}
