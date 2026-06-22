# holahabitos — Etapa 1 (núcleo de seguimiento por %)

**Fecha:** 2026-06-22
**Estado:** Diseño aprobado (pendiente review del spec)

## Objetivo

App web (PWA) de seguimiento de hábitos. La prioridad #1 es el **tracker de
porcentaje**: una pantalla de Reportes que, por cada hábito, muestre un heatmap
de cumplimiento y un **% del período** (Semana / Mes / Año), igual que el mockup
"Habit Reports".

Esta Etapa 1 entrega el flujo completo de valor: registrarse, crear hábitos con
meta, registrar progreso diario y ver el % de cumplimiento por período.

## Alcance

### Dentro de la Etapa 1
- Auth propia (registro/login con email + contraseña, sin proveedor externo).
- CRUD de hábitos (crear, editar, archivar).
- Pantalla **Hoy**: registrar progreso del día.
- Pantalla **Reportes**: heatmap + % por hábito, con vistas Semana/Mes/Año.

### Fuera de la Etapa 1 (etapas siguientes / YAGNI)
- **Quit habits** (rachas por tiempo transcurrido) → Etapa 2.
- Agrupación "Health Habits", "To-Do List" de la pantalla Today → Etapa 2.
- Journal, Timer → Etapa 3.
- Schedule (agenda calendario), widgets nativos → Etapa 4.
- Offline-first real (sincronización de datos sin conexión). En Etapa 1 la PWA es
  instalable y cachea el shell, pero los datos requieren conexión a Neon.

## Stack

- **Next.js (App Router)** — front + back en una sola base de código.
- **Neon (PostgreSQL serverless)** vía `@neondatabase/serverless` + **Drizzle ORM**.
- **Auth propia**: `bcryptjs` para hashear contraseñas, sesión en cookie firmada
  con `jose` (JWT). Middleware protege las rutas de la app.
- **Deploy**: Vercel. **PWA**: `manifest.json` + service worker (shell cacheado).
- **Tests**: Vitest (TDD para la lógica de %).

## Modelo de datos

### `users`
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| email | text unique | |
| password_hash | text | bcrypt |
| display_name | text | |
| created_at | timestamptz | default now() |

### `habits`
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | |
| name | text | "Tomar agua" |
| type | enum `count` \| `check` \| `duration` | tipo de progreso |
| unit | text null | "vasos", "min", "pasos"; null para `check` |
| target | numeric | meta (para `check` = 1) |
| target_period | enum `day` \| `week` | meta por día o por semana (ej. 200 pág/semana) |
| color | text | color del hábito |
| icon | text null | emoji/clave de ícono |
| active_days | smallint[] | días activos 0–6 (default todos) |
| sort_order | int | orden en las listas |
| archived | boolean | default false |
| created_at | timestamptz | default now() |

### `habit_logs`
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| habit_id | uuid FK → habits | |
| user_id | uuid FK → users | denormalizado para filtrar rápido |
| date | date | día del registro |
| value | numeric | cantidad hecha ese día |
| created_at / updated_at | timestamptz | |

Restricción **única** `(habit_id, date)`: un registro por hábito por día. Para
`check`, `value` es 0 o 1.

## Lógica de porcentaje (`lib/stats.ts`)

Módulo **puro** (sin I/O), testeado con TDD. Es el componente más crítico.

**Ratio diario** (para metas `target_period = day`):
```
ratioDia(value, target) = clamp(value / target, 0, 1)
```

**Ratio semanal** (para metas `target_period = week`): se suma el `value` de la
semana y se compara con la meta semanal:
```
ratioSemana(sumaSemana, target) = clamp(sumaSemana / target, 0, 1)
```

**% del período** que muestra Reportes:
- Meta diaria → promedio de `ratioDia` sobre los **días programados** (según
  `active_days`) dentro del período seleccionado.
- Meta semanal → promedio de `ratioSemana` sobre las **semanas** del período.
- Resultado `× 100`, redondeado.

**Heatmap**: una celda por unidad de tiempo (día en Semana/Mes; día o semana en
Año), coloreada por intensidad según el ratio (0 → vacío, 1 → color pleno).

### Funciones expuestas (firma conceptual)
- `dailyRatio(value, target)`
- `periodPercent(habit, logs, range)` → número 0–100
- `heatmapCells(habit, logs, range)` → celdas con `{ date, ratio }`

Casos de borde a cubrir en tests: `target = 0` (evitar /0), valores que superan la
meta (tope en 1), días no programados (excluidos del denominador), períodos sin
datos (0%), metas semanales a caballo entre meses.

## Pantallas y rutas

- `(auth)/login`, `(auth)/register` — formularios email + contraseña.
- `(app)/today` — selector de día de la semana; lista de hábitos activos ese día
  con su progreso. Botón **+** suma (count/duration); **check** marca (check).
  Mutaciones por Server Action `logProgress`.
- `(app)/reports` — toggle Semana/Mes/Año, navegación de período (‹ Hoy ›), y por
  cada hábito: heatmap + % grande. Pantalla prioritaria.
- `(app)/habits` — listado + alta/edición/archivado de hábitos (nombre, tipo,
  unidad, meta, `target_period`, color, días activos).

## Arquitectura

```
app/
  (auth)/login, register
  (app)/today, reports, habits
  layout.tsx (shell + nav)
db/
  schema.ts            # tablas Drizzle
  index.ts             # cliente Neon + drizzle
  queries/             # consultas (habits, logs, users)
lib/
  stats.ts             # lógica pura de % (TDD)
  auth.ts              # hash, sesión (jose), helpers
middleware.ts          # protege rutas (app)
public/manifest.json   # PWA
```

- **Mutaciones**: Server Actions (`logProgress`, `createHabit`, `updateHabit`,
  `archiveHabit`, `register`, `login`, `logout`).
- **Aislamiento**: la lógica de % vive en `lib/stats.ts` y no depende de la DB; se
  le pasan los logs ya leídos. Así se testea sola y la UI/queries pueden cambiar
  sin tocarla.

## Testing

- **Vitest + TDD** para `lib/stats.ts` (todos los casos de borde de arriba).
- Tests de integración livianos del flujo "registrar progreso → se refleja en
  Reportes" (Testing Library / Server Action).
- La lógica de auth (hash/verify, firmar/verificar sesión) con unit tests.

## Decisiones abiertas / supuestos

- "Base de usuarios local" se interpreta como **tabla `users` propia en Neon** con
  auth self-managed (sin Auth0/Clerk/Supabase Auth).
- El `DATABASE_URL` de Neon lo provee el usuario (crear proyecto Neon, o usar la
  integración Neon de Vercel). En dev se puede usar cualquier Postgres.
- Idioma de la UI: español.
