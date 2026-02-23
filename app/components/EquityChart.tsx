// components/EquityChart.tsx
import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid, ReferenceLine, Tooltip } from "recharts";

export type EquityPoint = {
  date: string;
  cumulative: number;
};

type Props = {
  data?: EquityPoint[];
  height?: number;
};

// --- Custom Tooltip ---
const CumTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const cum = payload[0]?.payload?.cumulative ?? null;
  if (cum === null || typeof cum === "undefined") return null;

  return (
    <div style={{
      background: "#0b0b0b",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 8,
      padding: 10,
      minWidth: 120,
      boxShadow: "0 8px 20px rgba(0,0,0,0.6)",
      fontSize: 13,
    }}>
      <div style={{ fontWeight: 800, marginBottom: 6, color: "#e5e7eb" }}>Date: {label}</div>
      <div>
        <span style={{ fontWeight: 700 }}>Cum : </span>
        <span style={{ color: cum >= 0 ? "#10b981" : "#ef4444", fontWeight: 900 }}>
          {cum >= 0 ? "+" : "-"}${Math.abs(Number(cum)).toFixed(2)}
        </span>
      </div>
    </div>
  );
};

// --- Custom Active Dot ---
const CustomActiveDot = (props: any) => {
  const { cx, cy, payload, dataKey } = props;
  if (payload[dataKey] === null || payload[dataKey] === undefined) return null;
  const isProfit = payload[dataKey] >= 0;
  return <circle cx={cx} cy={cy} r={5} fill={isProfit ? "#10b981" : "#ef4444"} stroke="#fff" strokeWidth={2} />;
};

export default function EquityChart({ data = [], height = 300 }: Props) {
  // 1. Clean the data to only track the continuous cumulative line
  const chartData = useMemo(() => {
    if (!data?.length) return [];
    return data.map((p) => ({
      date: p.date,
      cumulative: Number(p.cumulative ?? 0)
    }));
  }, [data]);

  // 2. Math to calculate perfectly round Y-Axis limits and the Zero Split
  const { min, max, off } = useMemo(() => {
    if (!chartData.length) return { min: -100, max: 100, off: 0.5 };
    const vals = chartData.map((d) => d.cumulative);
    let dataMin = Math.min(...vals, 0);
    let dataMax = Math.max(...vals, 0);
    
    // Pad the top and bottom so the line doesn't hit the absolute edges
    const pad = (dataMax - dataMin) * 0.1 || 50;
    dataMin = Math.floor(dataMin - pad);
    dataMax = Math.ceil(dataMax + pad);

    // Calculate where the "zero" line falls as a percentage (0 to 1) for the gradient split
    const range = dataMax - dataMin;
    const offset = range === 0 ? 0.5 : dataMax / range;

    return { min: dataMin, max: dataMax, off: offset };
  }, [chartData]);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 12, right: 24, left: 10, bottom: 8 }}>
          <defs>
            {/* Dynamic Stroke Gradient (The unbroken line) */}
            <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset={off} stopColor="#16a34a" stopOpacity={1} />
              <stop offset={off} stopColor="#dc2626" stopOpacity={1} />
            </linearGradient>
            {/* Dynamic Fill Gradient (The shading underneath) */}
            <linearGradient id="splitFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset={off} stopColor="#16a34a" stopOpacity={0.4} />
              <stop offset={off} stopColor="#dc2626" stopOpacity={0.4} />
            </linearGradient>
          </defs>

          {/* Professional Dotted Crosshair Grid */}
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          
          {/* X Axis */}
          <XAxis 
            dataKey="date" 
            tickFormatter={(d: string) => (typeof d === "string" && d.length >= 5 ? d.slice(5) : d)} 
            tick={{ fill: "#9ca3af", fontSize: 12, fontWeight: 500 }} 
            tickLine={false} 
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }} 
            minTickGap={20} 
          />
          
          {/* Y Axis with clean round intervals */}
          <YAxis 
            domain={[min, max]} 
            tickFormatter={(v) => v < 0 ? `-$${Math.abs(v)}` : `$${v}`} 
            tick={{ fill: "#9ca3af", fontSize: 12, fontWeight: 500 }} 
            tickLine={false} 
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }} 
            width={60} 
            tickCount={7}
          />
          
          {/* Solid Zero Line */}
          <ReferenceLine y={0} stroke="#6b7280" strokeWidth={2} strokeOpacity={0.8} />
          
          <Tooltip content={<CumTooltip />} cursor={{ stroke: "rgba(255,255,255,0.3)", strokeWidth: 1, strokeDasharray: "3 3" }} />

          {/* Single Unbroken Area */}
          <Area 
            type="monotone" 
            dataKey="cumulative" 
            stroke="url(#splitStroke)" 
            strokeWidth={3} 
            fill="url(#splitFill)" 
            dot={false} 
            activeDot={<CustomActiveDot />} 
            isAnimationActive={true} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}