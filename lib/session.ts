import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";

export const SESSION_COOKIE = "hh_session";

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
}

export async function requireUserId(): Promise<string> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s.userId;
}
