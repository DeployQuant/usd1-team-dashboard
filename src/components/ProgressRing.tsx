"use client";

export default function ProgressRing({
  percentage,
  size = 80,
  strokeWidth = 6,
  color = "#22d3ee",
  label,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="ring-chart" width={size} height={size}>
          <circle
            className="ring-track"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
          />
          <circle
            className="ring-fill"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold" style={{ fontSize: size * 0.22 }}>
            {percentage}%
          </span>
        </div>
      </div>
      {label && <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">{label}</span>}
    </div>
  );
}
