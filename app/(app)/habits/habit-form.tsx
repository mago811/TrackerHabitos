"use client";
import { useState } from "react";
import { saveHabit } from "./actions";

const DAYS = [
  { n: 1, label: "L" },
  { n: 2, label: "M" },
  { n: 3, label: "X" },
  { n: 4, label: "J" },
  { n: 5, label: "V" },
  { n: 6, label: "S" },
  { n: 0, label: "D" },
];

export function HabitForm() {
  const [type, setType] = useState<"count" | "check" | "duration">("count");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button className="add-habit" onClick={() => setOpen(true)}>
        + Nuevo hábito
      </button>
    );
  }

  return (
    <form action={saveHabit} className="habit-form">
      <input name="name" placeholder="Nombre del hábito" required />

      <label className="field">
        Tipo
        <select name="type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="count">Cantidad (ej. 8 vasos)</option>
          <option value="check">Sí/No (marcar)</option>
          <option value="duration">Duración (ej. 30 min)</option>
        </select>
      </label>

      {type !== "check" && (
        <div className="field-row">
          <label className="field">
            Meta
            <input name="target" type="number" min="1" step="any" defaultValue={1} required />
          </label>
          <label className="field">
            Unidad
            <input name="unit" placeholder="vasos, min, pasos" />
          </label>
          <label className="field">
            Por
            <select name="targetPeriod" defaultValue="day">
              <option value="day">Día</option>
              <option value="week">Semana</option>
            </select>
          </label>
        </div>
      )}
      {type === "check" && <input type="hidden" name="targetPeriod" value="day" />}

      <fieldset className="days">
        <legend>Días activos</legend>
        {DAYS.map((d) => (
          <label key={d.n} className="day-chk">
            <input type="checkbox" name="activeDays" value={d.n} defaultChecked />
            <span>{d.label}</span>
          </label>
        ))}
      </fieldset>

      <label className="field">
        Color
        <input name="color" type="color" defaultValue="#6366f1" />
      </label>

      <div className="field-row">
        <button type="submit">Guardar</button>
        <button type="button" className="secondary" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
