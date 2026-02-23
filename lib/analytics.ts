export type TradeRow = {
  id: number;
  trade_date: string; // YYYY-MM-DD
  side: "BUY" | "SELL";
  market_type: string;
  strategy_code: string;
  pnl_usd: number;
};

export type RangeKey = "daily" | "weekly" | "monthly" | "yearly";

function parseDate(d: string) {
  // treat as local date (avoid timezone shifting)
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function fmtYYYYMMDD(dt: Date) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function weekStart(dt: Date) {
  // Monday start
  const day = dt.getDay(); // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1) - day;
  const w = new Date(dt);
  w.setDate(dt.getDate() + diff);
  w.setHours(0, 0, 0, 0);
  return w;
}

export function bucketLabel(range: RangeKey, trade_date: string) {
  const dt = parseDate(trade_date);

  if (range === "daily") return trade_date;

  if (range === "weekly") {
    const ws = weekStart(dt);
    return `Wk of ${fmtYYYYMMDD(ws)}`;
  }

  if (range === "monthly") {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  // yearly
  return String(dt.getFullYear());
}

export function buildCumulativeSeries(trades: TradeRow[], range: RangeKey) {
  // group by bucket then cumulative
  const sorted = [...trades].sort((a, b) =>
    a.trade_date === b.trade_date ? a.id - b.id : a.trade_date.localeCompare(b.trade_date)
  );

  const bucketNet = new Map<string, number>();

  for (const t of sorted) {
    const key = bucketLabel(range, t.trade_date);
    bucketNet.set(key, (bucketNet.get(key) ?? 0) + Number(t.pnl_usd));
  }

  const labels = Array.from(bucketNet.keys());
  // labels already in chronological-ish order because sorted trades processed in order
  // but monthly/yearly could still be fine; if you want strict sorting later, we can improve.

  let running = 0;
  return labels.map((label) => {
    running += bucketNet.get(label) ?? 0;
    return { label, cumulative: Number(running.toFixed(2)) };
  });
}

export function summarize(trades: TradeRow[]) {
  const net = trades.reduce((a, t) => a + Number(t.pnl_usd), 0);
  const wins = trades.filter((t) => Number(t.pnl_usd) > 0);
  const losses = trades.filter((t) => Number(t.pnl_usd) < 0);

  const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;

  const avgWin = wins.length ? wins.reduce((a, t) => a + Number(t.pnl_usd), 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((a, t) => a + Number(t.pnl_usd), 0) / losses.length : 0;

  return {
    count: trades.length,
    net: Number(net.toFixed(2)),
    wins: wins.length,
    losses: losses.length,
    winRate: Number(winRate.toFixed(1)),
    avgWin: Number(avgWin.toFixed(2)),
    avgLoss: Number(avgLoss.toFixed(2)),
  };
}

export function breakdownBy(trades: TradeRow[], key: "side" | "market_type" | "strategy_code") {
  const map = new Map<string, TradeRow[]>();
  for (const t of trades) {
    const k = String((t as any)[key] ?? "Unknown");
    map.set(k, [...(map.get(k) ?? []), t]);
  }

  const rows = Array.from(map.entries()).map(([k, arr]) => {
    const s = summarize(arr);
    return { key: k, ...s };
  });

  // sort by net desc
  rows.sort((a, b) => b.net - a.net);
  return rows;
}
