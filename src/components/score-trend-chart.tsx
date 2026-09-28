import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScoreTrendPoint {
  id: string;
  /** 0–100 overall mock score. */
  score: number;
  /** Human-readable x-axis label (e.g. "3 weeks ago"). */
  label: string;
}

// A fixed viewBox that scales to its container. The 0–100 axis is deliberately
// not auto-scaled to the data: a flat run of 70s should look flat, not dramatic.
const WIDTH = 660;
const HEIGHT = 200;
const PADDING = { top: 16, right: 16, bottom: 28, left: 34 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;
const GRID_SCORES = [0, 25, 50, 75, 100];

function xAt(index: number, count: number): number {
  if (count <= 1) return PADDING.left + PLOT_WIDTH / 2;
  return PADDING.left + (index / (count - 1)) * PLOT_WIDTH;
}

function yAt(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  return PADDING.top + (1 - clamped / 100) * PLOT_HEIGHT;
}

/**
 * Overall mock-interview scores over time.
 *
 * Hand-rolled SVG rather than a charting dependency: it's one line and a
 * handful of dots, it renders as a server component with no client JS, and it
 * inherits the app's indigo/zinc palette directly. The score for every session
 * is also exposed as text (a screen-reader list and a `<title>` per point), so
 * the trend is available without a pointer.
 */
export function ScoreTrendChart({
  points,
  className,
}: {
  points: ScoreTrendPoint[];
  className?: string;
}) {
  if (points.length === 0) return null;

  const coords = points.map((point, index) => ({
    ...point,
    x: xAt(index, points.length),
    y: yAt(point.score),
  }));
  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.score - first.score;
  const baseline = PADDING.top + PLOT_HEIGHT;

  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPath = [
    `M ${coords[0].x},${baseline}`,
    ...coords.map((c) => `L ${c.x},${c.y}`),
    `L ${coords[coords.length - 1].x},${baseline}`,
    "Z",
  ].join(" ");

  const deltaCopy =
    delta === 0
      ? "Level with your first scored mock"
      : `${Math.abs(delta)} point${Math.abs(delta) === 1 ? "" : "s"} ${delta > 0 ? "up" : "down"} since your first scored mock`;

  return (
    <figure className={className}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Latest score</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums text-zinc-950">
            {last.score}
            <span className="ml-1 text-sm font-normal text-zinc-400">/ 100</span>
          </p>
        </div>
        <p
          className={cn(
            "inline-flex items-center gap-1.5 text-[13px] font-medium",
            delta > 0 ? "text-emerald-600" : delta < 0 ? "text-amber-600" : "text-zinc-500"
          )}
        >
          {delta > 0 ? (
            <TrendingUp className="size-4" aria-hidden />
          ) : delta < 0 ? (
            <TrendingDown className="size-4" aria-hidden />
          ) : (
            <Minus className="size-4" aria-hidden />
          )}
          {deltaCopy}
        </p>
      </div>

      <svg
        role="img"
        aria-label={`Line chart of ${points.length} mock interview ${points.length === 1 ? "score" : "scores"} out of 100, from ${first.score} on the oldest to ${last.score} on the latest.`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-4 h-44 w-full"
      >
        <defs>
          <linearGradient id="score-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>

        {GRID_SCORES.map((score) => (
          <g key={score}>
            <line
              x1={PADDING.left}
              y1={yAt(score)}
              x2={WIDTH - PADDING.right}
              y2={yAt(score)}
              stroke="#f4f4f5"
              strokeWidth="1"
            />
            <text
              x={PADDING.left - 8}
              y={yAt(score) + 3.5}
              textAnchor="end"
              className="fill-zinc-400 text-[10px] tabular-nums"
            >
              {score}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#score-trend-fill)" />
        {coords.length > 1 && (
          <polyline
            points={linePoints}
            fill="none"
            stroke="#4f46e5"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {coords.map((c, index) => {
          const isLatest = index === coords.length - 1;
          return (
            <circle
              key={c.id}
              cx={c.x}
              cy={c.y}
              r={isLatest ? 5 : 3.5}
              fill={isLatest ? "#4f46e5" : "#ffffff"}
              stroke="#4f46e5"
              strokeWidth="2"
            >
              <title>{`${c.label}: ${c.score}/100`}</title>
            </circle>
          );
        })}

        <text x={PADDING.left} y={HEIGHT - 8} className="fill-zinc-400 text-[10px]">
          {first.label}
        </text>
        {points.length > 1 && (
          <text x={WIDTH - PADDING.right} y={HEIGHT - 8} textAnchor="end" className="fill-zinc-400 text-[10px]">
            {last.label}
          </text>
        )}
      </svg>

      <ul className="sr-only">
        {points.map((point) => (
          <li key={point.id}>
            {point.label}: {point.score} out of 100
          </li>
        ))}
      </ul>
    </figure>
  );
}
