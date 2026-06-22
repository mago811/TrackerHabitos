"use server";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { upsertLog } from "@/db/queries";

export async function setProgress(formData: FormData) {
  const userId = await requireUserId();
  await upsertLog(
    userId,
    String(formData.get("habitId")),
    String(formData.get("date")),
    Math.max(0, Number(formData.get("value"))),
  );
  revalidatePath("/today");
  revalidatePath("/reports");
}
