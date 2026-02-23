// app/components/ThreeDBarChart.tsx
import React, { useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";

export type SideBar = {
  side: "BUY" | "SELL" | string;
  net: number;
  trades?: number;
  winRate?: number;
};

type Props = {
  sideBars?: SideBar[];
  height?: number;
  maxBarSize?: number;
};

// --- Custom Tooltip ---
const BuySellTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const side = data.side;
  const isBuy = side === "BUY";
  
  const sideColor = isBuy ? "#22c55e" : "#ef4444";
  const netVal = data.netSigned ?? 0;
  const winVal = data.winRate ?? 0;

  return (
    <div style={{
      background: "#000",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.18)",
      borderRadius: 10,
      padding: "10px 12px",
      boxShadow: "0 10px 24px rgba(0,0,0,0.6)",
      fontSize: 14,
      lineHeight: 1.35,
    }}>
      <div style={{ color: sideColor, fontWeight: 900, marginBottom: 6 }}>{side}</div>
      <div>
        <span style={{ fontWeight: 700 }}>Net:</span>{" "}
        <span style={{
          fontWeight: 900,
          color: netVal > 0 ? "#22c55e" : netVal < 0 ? "#ef4444" : "#e5e7eb",
        }}>
          {netVal > 0 ? "+" : ""}{netVal.toFixed(2)}
        </span>
      </div>
      <div>
        <span style={{ fontWeight: 700 }}>WinRate:</span>{" "}
        <span style={{ fontWeight: 800, color: "#e5e7eb" }}>{winVal}%</span>
      </div>
    </div>
  );
};

// --- Glossy 3D Bar ---
const Custom3DBar = (props: any) => {
  const { x = 0, y = 0, width = 40, height = 0, payload, isHovered } = props;
  const isBuy = payload?.side === "BUY";
  const isNegative = payload?.netSigned < 0;

  // 1. SAFELY HANDLE NEGATIVE HEIGHTS (Fixes the invisible body)
  const h = Math.abs(height);
  const rectY = height < 0 ? y + height : y;

  const topHeight = Math.max(6, Math.min(12, Math.round(width / 6)));
  
  // 2. Position the cap correctly
  const capY = isNegative ? rectY + h - topHeight : rectY;
  const highlightY = isNegative ? rectY + h - 2 : rectY + 1;

  const fillId = isBuy ? "url(#buyGloss)" : "url(#sellGloss)";
  const capColor = isBuy ? "#005a00" : "#dc2626";

  return (
    <g filter={isHovered ? "url(#hoverGlow)" : ""}>
      {/* Main Cylinder Body */}
      <rect x={x} y={rectY} width={width} height={h} rx={4} ry={4} fill={fillId} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />
      {/* 3D Cap */}
      <rect x={x + 1} y={capY} width={Math.max(0, width - 2)} height={topHeight} rx={3} ry={3} fill={capColor} opacity={0.8} />
      {/* Glossy Edge Highlight */}
      <rect x={x + 2} y={highlightY} width={Math.max(0, width - 4)} height={2} fill="rgba(255,255,255,0.4)" rx={1} />
    </g>
  );
};

export default function ThreeDBarChart({ sideBars = [], height = 260, maxBarSize = 56 }: Props) {
  const data = useMemo(() => sideBars.map((s) => ({ ...s, netSigned: Number(s.net || 0) })), [sideBars]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 16, right: 20, left: 12, bottom: 18 }} barCategoryGap="30%">
          <defs>
            {/* BUY: Blue and Green Gloss */}
            <linearGradient id="buyGloss" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#08306b" />
              <stop offset="50%" stopColor="#005a00" />
              <stop offset="100%" stopColor="#08306b" />
            </linearGradient>
            
            {/* SELL: Dark Red and Bright Red Gloss */}
            <linearGradient id="sellGloss" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#991b1b" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            <filter id="hoverGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
          
          {/* Puts the labels slightly higher so they don't clip the bottom */}
          <XAxis dataKey="side" axisLine={false} tickLine={false} tick={{ fill: "#cbd5e1", fontSize: 13, fontWeight: 600 }} padding={{ left: 12, right: 12 }} />
          <YAxis tickFormatter={(v) => `$${Number(v).toFixed(0)}`} axisLine={false} tickLine={false} width={80} tick={{ fill: "#cbd5e1", fontSize: 12 }} />
          
          {/* Explicit $0 line separator */}
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />

          <Tooltip content={<BuySellTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />

          <Bar
            dataKey="netSigned"
            maxBarSize={maxBarSize}
            shape={(props: any) => <Custom3DBar {...props} isHovered={hoveredIdx === props.index} />}
            onMouseEnter={(_, idx: number) => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {data.map((entry, i) => (
              <Cell key={`cell-${i}`} opacity={hoveredIdx === null || hoveredIdx === i ? 1 : 0.7} style={{ transition: 'opacity 0.2s ease' }} />
            ))}
          </Bar>
        </BarChart> 
      </ResponsiveContainer>
    </div>
  );
}