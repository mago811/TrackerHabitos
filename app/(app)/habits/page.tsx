import { requireUserId } from "@/lib/session";
import { listHabits } from "@/db/queries";
import { HabitForm } from "./habit-form";
import { removeHabit } from "./actions";

const TYPE_LABEL: Record<string, string> = {
  count: "Cantidad",
  check: "Sí/No",
  duration: "Duración",
};

export default async function HabitsPage() {
  const userId = await requireUserId();
  const habits = await listHabits(userId);

  return (
    <section className="page">
      <h1>Hábitos</h1>

      <ul className="habit-list">
        {habits.length === 0 && <li className="empty">Todavía no tenés hábitos. ¡Creá el primero!</li>}
        {habits.map((h) => (
          <li key={h.id} className="habit-item" style={{ borderLeftColor: h.color }}>
            <div>
              <strong>{h.name}</strong>
              <span className="habit-meta">
                {TYPE_LABEL[h.type]}
                {h.type !== "check" &&
                  ` · ${Number(h.target)} ${h.unit ?? ""} / ${h.targetPeriod === "day" ? "día" : "semana"}`}
              </span>
            </div>
            <form action={removeHabit}>
              <input type="hidden" name="id" value={h.id} />
              <button type="submit" className="link-danger" aria-label="Archivar">
                Archivar
              </button>
            </form>
          </li>
        ))}
      </ul>

      <HabitForm />
    </section>
  );
}
