import type { HeatCell } from "@/lib/types";

export function Heatmap({ cells, color }: { cells: HeatCell[]; color: string }) {
  return (
    <div className="heatmap">
      {cells.map((c) => (
        <span
          key={c.date}
          className="heat-cell"
          title={`${c.date}: ${Math.round(c.ratio * 100)}%`}
          style={{
            backgroundColor: color,
            opacity: c.ratio === 0 ? 0.12 : 0.25 + c.ratio * 0.75,
          }}
        />
      ))}
    </div>
  );
}
