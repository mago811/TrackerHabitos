"use client";
import { useRef } from "react";
import { setProgress } from "./actions";

type Props = {
  habitId: string;
  date: string;
  type: "count" | "check" | "duration";
  target: number;
  unit: string | null;
  color: string;
  value: number;
};

export function HabitRow({ habitId, date, type, target, unit, color, value }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const valRef = useRef<HTMLInputElement>(null);

  const submit = (newVal: number) => {
    if (valRef.current) valRef.current.value = String(Math.max(0, newVal));
    formRef.current?.requestSubmit();
  };

  const ratio = target > 0 ? Math.min(value / target, 1) : 0;
  const done = ratio >= 1;

  return (
    <li className="today-row" style={{ borderLeftColor: color }}>
      <form ref={formRef} action={setProgress} className="today-form">
        <input type="hidden" name="habitId" value={habitId} />
        <input type="hidden" name="date" value={date} />

        <div className="today-info">
          <span className="today-progress">
            {type === "check"
              ? done
                ? "Hecho"
                : "Pendiente"
              : `${value} / ${target} ${unit ?? ""}`}
          </span>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${ratio * 100}%`, backgroundColor: color }} />
          </div>
        </div>

        {type === "check" ? (
          <>
            <input ref={valRef} type="hidden" name="value" defaultValue={value} />
            <button
              type="button"
              className={`check-btn ${done ? "checked" : ""}`}
              onClick={() => submit(done ? 0 : 1)}
              aria-label={done ? "Desmarcar" : "Marcar"}
            >
              ✓
            </button>
          </>
        ) : (
          <div className="stepper">
            <button type="button" onClick={() => submit(value - 1)} aria-label="Restar">
              −
            </button>
            <input
              ref={valRef}
              name="value"
              type="number"
              min="0"
              step="any"
              defaultValue={value}
              onBlur={() => formRef.current?.requestSubmit()}
            />
            <button type="button" onClick={() => submit(value + 1)} aria-label="Sumar">
              +
            </button>
          </div>
        )}
      </form>
    </li>
  );
}
