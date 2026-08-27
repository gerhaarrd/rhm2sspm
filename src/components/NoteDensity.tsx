/** Compact bar-chart sparkline of note density across the track. */
export function NoteDensity({ density }: { density: number[] }) {
  if (density.length === 0 || density.every((v) => v === 0)) return null;

  return (
    <svg
      viewBox={`0 0 ${density.length} 20`}
      preserveAspectRatio="none"
      className="h-4 w-24 shrink-0 text-blue-400/70"
    >
      {density.map((value, i) => {
        const height = Math.max(value * 20, 1.5);
        return (
          <rect
            key={i}
            x={i}
            y={20 - height}
            width={0.7}
            height={height}
            fill="currentColor"
            rx={0.3}
          />
        );
      })}
    </svg>
  );
}
