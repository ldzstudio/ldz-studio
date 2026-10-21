import "server-only";
import { cookies } from "next/headers";
import { one } from "./db";
import { CUSTOMER_COOKIE, signSession, verifySession } from "./session";

export type Address = { cep: string; street: string; number: string; complement: string; district: string; city: string; state: string };
export type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  address: Address | null;
  created_at: string;
};

export async function getCustomer() {
  const jar = await cookies();
  const s = await verifySession(jar.get(CUSTOMER_COOKIE)?.value, "customer");
  if (!s) return null;
  return one<Customer>("select id, name, email, phone, cpf, address, created_at from customers where id=$1", [s.id]);
}

export async function startCustomerSession(id: number, email: string) {
  (await cookies()).set(CUSTOMER_COOKIE, await signSession(id, email, "customer"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function endCustomerSession() {
  (await cookies()).delete(CUSTOMER_COOKIE);
}
