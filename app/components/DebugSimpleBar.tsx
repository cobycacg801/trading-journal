"use client";
// components/ThreeDBarChart.tsx
import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type DataPoint = {
  name: string;
  buy: number;
  sell: number;
};

const data: DataPoint[] = [
  { name: "Mon", buy: 2400, sell: 1200 },
  { name: "Tue", buy: 1398, sell: 2210 },
  { name: "Wed", buy: 9800, sell: 2290 },
  { name: "Thu", buy: 3908, sell: 2000 },
  { name: "Fri", buy: 4800, sell: 2181 },
];

const BUY_LEFT = "#08306b"; // deep blue
const BUY_RIGHT = "#005a00"; // green (you used for BUY pair)
const SELL_LEFT = "#991b1b"; // dark red
const SELL_RIGHT = "#dc2626"; // lighter red

// Custom tooltip matching dark theme
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        background: "#0b0b0b",
        color: "#fff",
        padding: 10,
        borderRadius: 8,
        boxShadow: "0 6px 18px rgba(0,0,0,0.6)",
        minWidth: 140,
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <div style={{ color: p.fill }}>{p.name ?? p.dataKey}</div>
          <div style={{ fontWeight: 700 }}>{p.value}</div>
        </div>
      ))}
    </div>
  );
};

// Custom 3D glossy bar shape.
// Recharts passes x, y, width, height, fill, payload, etc.
const GlossyBar = (props: any) => {
  const { x, y, width, height, fill, idPrefix } = props;
  if (width <= 0 || height <= 0) return null;

  const rx = Math.min(6, width * 0.08); // corner radius
  const gradientId = `${idPrefix}-gradient`;
  const glossId = `${idPrefix}-gloss`;
  const shadowId = `${idPrefix}-shadow`;

  // draw main rounded rect, then overlay a lighter glossy shape and subtle top highlight
  const mainRect = (
    <rect x={x} y={y} width={width} height={height} rx={rx} ry={rx} fill={`url(#${gradientId})`} />
  );

  // highlight strip at top-left (tilted highlight)
  const highlightHeight = Math.max(6, Math.min(14, height * 0.18));
  const highlight = (
    <path
      d={`
        M ${x + rx} ${y + highlightHeight * 0.2}
        Q ${x + rx + width * 0.12} ${y - highlightHeight * 0.6} ${x + width * 0.6} ${y + highlightHeight * 0.2}
        L ${x + width - rx} ${y + highlightHeight * 1.2}
        Q ${x + width - rx - width * 0.06} ${y + highlightHeight * 1.5} ${x + width * 0.5} ${y + highlightHeight * 1.0}
        Z
      `}
      fill={`url(#${glossId})`}
      opacity={0.65}
      style={{ mixBlendMode: "screen" as const }}
    />
  );

  // small bottom inner shadow for depth
  const innerShadow = (
    <rect
      x={x}
      y={y + height - Math.min(10, height * 0.14)}
      width={width}
      height={Math.min(10, height * 0.14)}
      rx={rx}
      fill="rgba(0,0,0,0.12)"
      opacity={0.65}
    />
  );

  // subtle outer shadow (blur)
  const outerShadow = (
    <g filter={`url(#${shadowId})`}>
      <rect
        x={x + 1}
        y={y + 2}
        width={width}
        height={height}
        rx={rx}
        fill="rgba(0,0,0,0.18)"
        opacity={0.8}
      />
    </g>
  );

  return (
    <g>
      {/* defs for this bar */}
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1">
          {/* left darker / right lighter for pseudo-3D */}
          <stop offset="0%" stopColor={fill.left} />
          <stop offset="55%" stopColor={fill.right} />
          <stop offset="100%" stopColor={shadeColor(fill.right, -6)} />
        </linearGradient>

        <linearGradient id={glossId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
        </linearGradient>

        <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feOffset dx="0" dy="3" result="o" />
          <feMerge>
            <feMergeNode in="o" />
            <feMergeNode in="b" />
          </feMerge>
        </filter>
      </defs>

      {outerShadow}
      {mainRect}
      {highlight}
      {innerShadow}
    </g>
  );
};

// small helper to darken/lighten a hex color (works with #RRGGBB)
function shadeColor(hex: string, percent: number) {
  // clamp percent within -100..100
  const p = Math.max(-100, Math.min(100, percent));
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + Math.round((p / 100) * 255)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + Math.round((p / 100) * 255)));
  const b = Math.max(0, Math.min(255, (num & 0xff) + Math.round((p / 100) * 255)));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
}

export default function ThreeDBarChart() {
  // We render two Bars side-by-side for each category (buy / sell).
  // Use barSize + barGap + barCategoryGap to control spacing.
  return (
    <div style={{ width: "100%", height: 360, background: "linear-gradient(180deg, #05060a, #0b0f14)" , padding: 14, borderRadius: 12 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 18, left: 12, bottom: 6 }}
          barGap={8} // gap between bars in same category
          barCategoryGap="28%" // spacing between groups
        >
          <CartesianGrid vertical={false} stroke="#111417" strokeDasharray="3 3" />
          <XAxis dataKey="name" stroke="#8b98a6" axisLine={false} tickLine={false} />
          <YAxis stroke="#8b98a6" axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" wrapperStyle={{ color: "#c6d0da" }} />

          {/* BUY bar */}
          <Bar
            dataKey="buy"
            name="BUY"
            fill={{ left: BUY_LEFT, right: BUY_RIGHT } as any}
            maxBarSize={40}
            // render custom SVG per bar
            shape={(barProps: any) =>
              GlossyBar({ ...barProps, idPrefix: `buy-${barProps.index}`, fill: { left: BUY_LEFT, right: BUY_RIGHT } })
            }
          />

          {/* SELL bar */}
          <Bar
            dataKey="sell"
            name="SELL"
            fill={{ left: SELL_LEFT, right: SELL_RIGHT } as any}
            maxBarSize={40}
            shape={(barProps: any) =>
              GlossyBar({ ...barProps, idPrefix: `sell-${barProps.index}`, fill: { left: SELL_LEFT, right: SELL_RIGHT } })
            }
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
