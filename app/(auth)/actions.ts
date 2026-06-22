"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { hashPassword, verifyPassword, signSession } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";

async function setSession(userId: string) {
  const token = await signSession({ userId });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function register(formData: FormData) {
  const email = String(formData.get("email")).toLowerCase().trim();
  const password = String(formData.get("password"));
  const displayName = String(formData.get("displayName") || email.split("@")[0]);
  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length) throw new Error("Ese email ya está registrado");
  const [u] = await db
    .insert(users)
    .values({ email, passwordHash: await hashPassword(password), displayName })
    .returning();
  await setSession(u.id);
  redirect("/today");
}

export async function login(formData: FormData) {
  const email = String(formData.get("email")).toLowerCase().trim();
  const password = String(formData.get("password"));
  const [u] = await db.select().from(users).where(eq(users.email, email));
  if (!u || !(await verifyPassword(password, u.passwordHash))) {
    throw new Error("Credenciales inválidas");
  }
  await setSession(u.id);
  redirect("/today");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
