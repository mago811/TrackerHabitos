"use server";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { createHabit, updateHabit, archiveHabit, type HabitInput } from "@/db/queries";

function parse(formData: FormData): HabitInput {
  const type = String(formData.get("type")) as HabitInput["type"];
  return {
    name: String(formData.get("name")).trim(),
    type,
    unit: type === "check" ? null : String(formData.get("unit") || "").trim() || null,
    target: type === "check" ? 1 : Number(formData.get("target")),
    targetPeriod: String(formData.get("targetPeriod")) as HabitInput["targetPeriod"],
    color: String(formData.get("color") || "#6366f1"),
    icon: String(formData.get("icon") || "") || null,
    activeDays: formData.getAll("activeDays").map(Number),
  };
}

export async function saveHabit(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") || "");
  if (id) await updateHabit(userId, id, parse(formData));
  else await createHabit(userId, parse(formData));
  revalidatePath("/habits");
  revalidatePath("/today");
  revalidatePath("/reports");
}

export async function removeHabit(formData: FormData) {
  const userId = await requireUserId();
  await archiveHabit(userId, String(formData.get("id")));
  revalidatePath("/habits");
}
