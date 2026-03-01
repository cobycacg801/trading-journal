"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import ThreeDBarChart from "../components/ThreeDBarChart";
import EquityChart from "../components/EquityChart"; // Ensure this path is correct

type TradeRow = {
  id: number;
  user_id: string;
  trade_date: string;
  side: "BUY" | "SELL";
  outcome: "TP" | "SL" | "BE";
  instrument_type: string;
  instrument_symbol: string;
  market_type: string;
  schedule: string;
  strategy_code: string;
  pnl_usd: number;
  notes: string | null;
  psychology: string | null;
  created_at: string;
  image_url?: string | null;
  account_mode: "REAL" | "PLAYBACK";
  risk_percentage: number;
};



const PSYCHOLOGY_OPTIONS = [
  "Followed Plan",
  "Perfect Execution",
  "FOMO",
  "Revenge Trade",
  "Hesitated",
  "Boredom / Overtrading"
];
export default function DashboardPage() {
  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [msg, setMsg] = useState<string>("");
  const [riskPercentage, setRiskPercentage] = useState(1.0);
const [strategyCode, setStrategyCode] = useState('breakout');
// --- Task 1: Strategies Management ---
  const [strategies, setStrategies] = useState<{ label: string; code: string }[]>([]);
  const [newStrategyName, setNewStrategyName] = useState('');

  const addStrategy = () => {
    if (newStrategyName.trim()) {
      const newObj = { 
        label: newStrategyName, 
        code: newStrategyName.toLowerCase().trim().replace(/\s+/g, '-') 
      };
      setStrategies([...strategies, newObj]);
      setNewStrategyName('');
    }
  };

  const removeStrategy = (codeToRemove: string) => {
    setStrategies(strategies.filter(s => s.code !== codeToRemove));
  };
  const renameStrategy = async (oldCode: string, newLabel: string) => {
  const newCode = newLabel.toLowerCase().trim().replace(/\s+/g, '-');

  // 1. Update the local state for a fast UI feel
  setStrategies(prev => prev.map(s => s.code === oldCode ? { label: newLabel, code: newCode } : s));

  // 2. CRITICAL: Update the database so old trades stay linked
  const { error } = await supabase
    .from('trades')
    .update({ strategy_code: newCode })
    .eq('strategy_code', oldCode);

  if (error) console.error("Database sync failed:", error);
};
const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error logging out:', error.message);
  } else {
    // This sends you back to your new Command Center
    window.location.href = '/login';
  }
};
// NEW: Futures Market Status Logic (CME Schedule)
  const [isMarketOpen, setIsMarketOpen] = useState(false);

  useEffect(() => {
    const checkMarketStatus = () => {
      // Syncs strictly to New York time for accurate exchange hours
      const nyTime = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
      const day = nyTime.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
      const hours = nyTime.getHours(); // 0 to 23

      let isOpen = false;

      if (day === 0) {
        // Sunday: Opens at 6:00 PM NY time
        isOpen = hours >= 18;
      } else if (day >= 1 && day <= 4) {
        // Mon-Thu: Open 23 hours a day, halted strictly from 5 PM to 6 PM NY time
        isOpen = hours !== 17;
      } else if (day === 5) {
        // Friday: Closes for the weekend at 5:00 PM NY time
        isOpen = hours < 17;
      } else if (day === 6) {
        // Saturday: Closed all day
        isOpen = false;
      }

      setIsMarketOpen(isOpen);
    };

    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 60000); // Checks every minute
    return () => clearInterval(interval);
  }, []);
  // Form State
  const [tradeDate, setTradeDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [outcome, setOutcome] = useState<"TP" | "SL" | "BE">("TP");
  const [rangeFilter, setRangeFilter] = useState('all');
  // 1. Smart State: Loads your saved capital from memory, or defaults to $0
  const [startingCapital, setStartingCapital] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("journalStartingCapital");
      // Use !== null so the app knows that saving "0" is a valid number!
      if (saved !== null) return Number(saved); 
    }
    return 0; // <--- Changed default to 0
  });

  // 2. Auto-Save: Whenever you change the number, it saves instantly
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("journalStartingCapital", startingCapital.toString());
    }
  }, [startingCapital]);

 
  const [accountMode, setAccountMode] = useState<"REAL" | "PLAYBACK">("REAL");
  const [instrumentType, setInstrumentType] = useState<string>("Future");
  const [instrumentSymbol, setInstrumentSymbol] = useState<string>("MNQ");
  const [marketType, setMarketType] = useState<string>("NY");
  const [schedule, setSchedule] = useState<string>("Morning");
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
const [selectedMonth, setSelectedMonth] = useState<string>("ALL");

// NEW: State for the specific strategy chart
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
// 1. Filter trades based on selected date range and account mode
      const filteredTrades = trades.filter(trade => {
  // 1. Keep the Practice vs Real logic
  const matchMode = trade.account_mode === accountMode;
  
  // 2. Add the Year logic
  const tradeYear = trade.trade_date ? trade.trade_date.substring(0, 4) : "";
  const matchYear = selectedYear === "ALL" || tradeYear === selectedYear;
  
  // 3. Add the Month logic
  const tradeMonth = trade.trade_date ? trade.trade_date.substring(5, 7) : "";
  const matchMonth = selectedMonth === "ALL" || tradeMonth === selectedMonth;

  // --- NEW: STRATEGY CONNECTION ---
    const tradeStrat = (trade.strategy_code || "Unknown").trim().toUpperCase();
    const matchStrategy = !selectedStrategy || tradeStrat === selectedStrategy;

    return matchMode && matchYear && matchMonth && matchStrategy;
  });  
const [pnlUsd, setPnlUsd] = useState<number>(150);
  const [notes, setNotes] = useState<string>("");
  const [psychology, setPsychology] = useState<string>(PSYCHOLOGY_OPTIONS[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  

  // Calendar State
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth());
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  // List & Pagination State
  const [isTradesListOpen, setIsTradesListOpen] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const tradesPerPage = 10;
  const fetchTrades = async () => {
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("trade_date", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      setMsg("Fetch error: " + error.message);
      setTrades([]);
      return;
    }
    setTrades((data as TradeRow[]) ?? []);
  };

const getStrategyStats = () => {
  const stats: Record<string, { total: number, win: number, loss: number, be: number, pnl: number }> = {};

  // 1. FILTER BY MODE: This forces the Leaderboard to ONLY look at trades for your active tab!
  const activeTrades = filteredTrades; // Now it obeys Year, Month, AND Account Mode!

  activeTrades.forEach(t => {
  // Use Strategy_code (with a capital S) if that's what your CSV/Supabase uses
  const rawName = t.strategy_code || 'Unknown';
  const strat = rawName.trim().toUpperCase();
  
  if (!stats[strat]) {
    stats[strat] = { total: 0, win: 0, loss: 0, be: 0, pnl: 0 };
  }
  
  stats[strat].total++;
  if (t.outcome === 'TP') stats[strat].win++;
  else if (t.outcome === 'SL') stats[strat].loss++;
  else if (t.outcome === 'BE') stats[strat].be++;
  
  stats[strat].pnl += Number(t.pnl_usd || 0);
});

  return Object.entries(stats).map(([name, data]) => ({
    name,
    ...data,
    winRate: data.win + data.loss > 0 
      ? ((data.win / (data.win + data.loss)) * 100).toFixed(1) 
      : "0.0"
  })).sort((a, b) => Number(b.winRate) - Number(a.winRate));
};

// --- Strategy & Profit Analysis Logic ---
// 1. Filter trades to only include the current mode (REAL vs PLAYBACK)
const currentModeTrades = trades.filter(t => t.account_mode === accountMode);

// 2. Calculate profit ONLY for the active mode
const totalNetProfit = currentModeTrades.reduce((sum, t) => sum + (Number(t.pnl_usd) || 0), 0);
const currentBalance = Number(startingCapital) + totalNetProfit;

// 3. Identify underperforming strategies ONLY within the current mode
const underperformingStrategies = getStrategyStats()
  .filter(s => currentModeTrades.some(t => (t.strategy_code || 'Unknown') === s.name))
  .filter(s => Number(s.winRate) < 40 && s.total >= 3);

  // 1. Fetch trades on load
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        window.location.href = "/";
        return;
      }
      setUserId(data.user.id);
      setEmail(data.user.email ?? "");
      await fetchTrades();
    };
    init();
  }, []);

 // --- BULK CSV IMPORT LOGIC ---
const handleCleanSlate = async () => {
  // We skip the "Confirm" and go straight to the "Type to Delete" box
  const typedWord = window.prompt(
    `DANGER: This will permanently delete ALL ${accountMode} trades.\n\nTo confirm, please type "DELETE" in the box below:`
  );

  // 1. If they hit "Cancel", typedWord will be null
  // 2. If they type it wrong, it won't match "DELETE"
  if (typedWord !== "DELETE") {
    alert("Action cancelled. Your data is safe.");
    return;
  }

  // If we get here, they typed it correctly!
  setIsImporting(true);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("trades")
      .delete()
      .eq("account_mode", accountMode)
      .eq("user_id", user.id);

    if (error) throw error;

    // Refresh everything
    await fetchTrades();
    alert(`Successfully cleared all ${accountMode} trades.`);
  } catch (err: any) {
    alert("Error clearing trades: " + err.message);
  } finally {
    setIsImporting(false);
  }
};
 const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file || !userId) return;

  setIsImporting(true);
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    const text = e.target?.result as string;
    
    // 1. Split file into rows
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) {
      alert("File seems empty.");
      setIsImporting(false);
      return;
    }

    // 2. Identify exact column headers based on your NEW file names!
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const dateIdx = headers.findIndex(h => h.includes('date'));
    const outcomeIdx = headers.findIndex(h => h.includes('outcome'));
    const sideIdx = headers.findIndex(h => h.includes('side'));
    const pnlIdx = headers.findIndex(h => h.includes('p&l') || h.includes('pnl'));
    const strategyIdx = headers.findIndex(h => h.includes('strategy'));
    const notesIdx = headers.findIndex(h => h.includes('notes') || h.includes('analysis'));
    
    const instIdx = headers.findIndex(h => h.includes('instrument_type') || h.includes('inst'));
    const symbolIdx = headers.findIndex(h => h.includes('symbol'));
    const riskIdx = headers.findIndex(h => h.includes('risk'));
    const marketIdx = headers.findIndex(h => h.includes('market')); 
    const scheduleIdx = headers.findIndex(h => h.includes('schedule')); // Now explicitly looks for schedule!
    const psychIdx = headers.findIndex(h => h.includes('psychology'));
    const modeIdx = headers.findIndex(h => h.includes('account_mode'));

    const parseCSVRow = (rowText: string) => {
      let inQuotes = false, currentVal = '';
      const row = [];
      for (let char of rowText) {
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) { row.push(currentVal.trim()); currentVal = ''; }
        else currentVal += char;
      }
      row.push(currentVal.trim());
      return row;
    };

    const tradesToInsert = [];
    
    // 3. Process every single trade in the file
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVRow(lines[i]);
      if (row.length < 3) continue; 

      const rawDate = dateIdx >= 0 && row[dateIdx] ? row[dateIdx] : "";
      const rawOutcome = outcomeIdx >= 0 && row[outcomeIdx] ? row[outcomeIdx].toUpperCase() : "BE";
      const rawSide = sideIdx >= 0 && row[sideIdx] ? row[sideIdx].toUpperCase() : "BUY";
      const rawStrategy = strategyIdx >= 0 && row[strategyIdx] ? row[strategyIdx] : "Unknown";
      const rawNotes = notesIdx >= 0 && row[notesIdx] ? row[notesIdx] : "";
      
      const rawInst = instIdx >= 0 && row[instIdx] ? row[instIdx] : "Future";
      const rawSymbol = symbolIdx >= 0 && row[symbolIdx] ? row[symbolIdx] : "MNQ";
      const rawRisk = riskIdx >= 0 && row[riskIdx] ? parseFloat(row[riskIdx]) : 1;
      
      const rawMarket = marketIdx >= 0 && row[marketIdx] ? row[marketIdx] : "New York (NY)";
      const rawSchedule = scheduleIdx >= 0 && row[scheduleIdx] ? row[scheduleIdx] : "Morning";
      const rawPsych = psychIdx >= 0 && row[psychIdx] ? row[psychIdx] : "Followed Plan";
      
      // Smart feature: It will read the PLAYBACK/REAL mode directly from your CSV now!
      const rawMode = modeIdx >= 0 && row[modeIdx] ? row[modeIdx].toUpperCase() : accountMode;

// --- FLEXIBLE P&L MATH (NinjaTrader Sync) ---
      let pnlValue = 0;
      if (pnlIdx >= 0 && row[pnlIdx]) {
        // 1. Remove $, commas, and spaces
        let cleanPnl = row[pnlIdx].replace(/[$,\s]/g, '');

        // 2. Handle Parentheses (e.g., "(110.00)" -> "-110.00")
        if (cleanPnl.startsWith('(') && cleanPnl.endsWith(')')) {
          cleanPnl = '-' + cleanPnl.slice(1, -1);
        }
        
        pnlValue = parseFloat(cleanPnl) || 0;
      }

      // 3. Logic Sync: Only intervene for Stop Losses to ensure they are negative
      if (rawOutcome === 'SL') {
        // If it's a loss, it MUST be negative. 
        pnlValue = -Math.abs(pnlValue); 
      } 
      // BE and TP will now keep whatever exact decimal value came from your CSV!

      // Format Date
      let formattedDate = new Date().toISOString().split('T')[0];
      try { if (rawDate) { const d = new Date(rawDate); if (!isNaN(d.getTime())) formattedDate = d.toISOString().split('T')[0]; } } catch(err) {}

    const handleCleanSlate = async () => {
  // 1. Safety First: Ask for confirmation
  const confirmed = window.confirm(
    `WARNING: This will permanently delete ALL ${accountMode} trades from your database. This cannot be undone. Are you sure?`
  );

  if (!confirmed) return;

  setIsImporting(true); // Re-use the loading state

  try {
    // 2. Delete from Supabase based on the active tab (REAL or PLAYBACK)
    const { error } = await supabase
      .from("trades")
      .delete()
      .eq("account_mode", accountMode)
      .eq("user_id", userId); // Critical: ensures you only delete your own data

    if (error) throw error;

    // 3. Refresh the UI
    await fetchTrades();
    alert(`Successfully cleared all ${accountMode} trades.`);
  } catch (err: any) {
    alert("Error clearing trades: " + err.message);
  } finally {
    setIsImporting(false);
  }
};
    
    
      // Build the exact data package Supabase expects (Notice we are using "schedule" now!)
      tradesToInsert.push({
        user_id: userId,
        trade_date: formattedDate,
        side: rawSide,
        outcome: rawOutcome,
        pnl_usd: pnlValue,
        strategy_code: rawStrategy,
        notes: rawNotes,
        account_mode: rawMode, 
        instrument_type: rawInst, 
        instrument_symbol: rawSymbol, 
        risk_percentage: rawRisk,
        market_type: rawMarket, 
        schedule: rawSchedule,  // Changed this from 'market_session' to 'schedule' to fix the error!
        psychology: rawPsych    // Added psychology support!
      });
    }

    if (tradesToInsert.length > 0) {
       const { error } = await supabase.from('trades').insert(tradesToInsert);
       if (error) {
          alert("Error importing to database: " + error.message);
       } else {
          alert(`Success! Imported ${tradesToInsert.length} trades.`);
          await fetchTrades(); 
       }
    } else {
       alert("No valid trades found to import.");
    }
    
    setIsImporting(false);
    event.target.value = '';
  };
  
  reader.readAsText(file);
};
  // --- Create or Update Trade ---
  const saveTrade = async () => {
    setMsg("");

    let imageUrlToSave = null;

    // --- NEW: Image Upload Logic ---
    if (imageFile) {
      setMsg("Uploading image...");
      // Extract the file extension (like .png or .jpg)
      const fileExt = imageFile.name.split('.').pop();
      // Create a unique random file name
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload to the Supabase cloud bucket
      const { error: uploadError } = await supabase.storage
        .from('trades-images')
        .upload(fileName, imageFile);

      if (uploadError) {
        setMsg("❌ Image upload failed: " + uploadError.message);
        return; // Stop the save process if the image fails
      }

      // Get the live public web link for the image
      const { data } = supabase.storage.from('trades-images').getPublicUrl(fileName);
      imageUrlToSave = data.publicUrl;
    }
    // --------------------------------

    const normalizedPnl = outcome === "SL" ? -Math.abs(Number(pnlUsd)) : Math.abs(Number(pnlUsd));

    const tradeData = {
      user_id: userId,
      trade_date: tradeDate,
      side,
      outcome,
      instrument_type: instrumentType,
      instrument_symbol: instrumentSymbol,
      market_type: marketType,
      schedule,
      strategy_code: strategyCode,
      pnl_usd: normalizedPnl,
      notes: notes || null,
      psychology: psychology,
      account_mode: accountMode,
      image_url: imageUrlToSave // <--- NEW IMAGE LINK SAVED TO DATABASE
    };

    if (editingId) {
      // UPDATE existing trade
      const { error } = await supabase.from("trades").update(tradeData).eq("id", editingId);
      if (error) { setMsg("Update error: " + error.message); return; }
      setMsg("✅ Trade updated.");
      setEditingId(null);
    } else {
      // INSERT new trade
      const { error } = await supabase.from("trades").insert(tradeData);
      if (error) { setMsg("Insert error: " + error.message); return; }
      setMsg("✅ Trade saved.");
    }
    
    setImageFile(null); // <--- Clears the file box after a successful save

    setNotes("");
    await fetchTrades();
  };

  // --- Load Trade into Form ---
  const startEdit = (t: TradeRow) => {
    setEditingId(t.id);
    setTradeDate(t.trade_date);
    setSide(t.side);
    setOutcome(t.outcome);
    setInstrumentType(t.instrument_type);
    setInstrumentSymbol(t.instrument_symbol);
    setMarketType(t.market_type);
    setSchedule(t.schedule);
    setStrategyCode(t.strategy_code);
    setPnlUsd(Math.abs(Number(t.pnl_usd)));
    setNotes(t.notes || "");
    setPsychology(t.psychology || PSYCHOLOGY_OPTIONS[0]);
    window.scrollTo({ top: 0, behavior: "smooth" }); // Smoothly scroll to top form
  };

  // --- Delete Trade ---
  const deleteTrade = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this trade?")) return;
    setMsg("");
    const { error } = await supabase.from("trades").delete().eq("id", id);
    if (error) { setMsg("Delete error: " + error.message); return; }
    setMsg("🗑️ Trade deleted.");
    await fetchTrades();
  };
// --- Export to CSV ---
  const exportToCSV = () => {
    if (analytics.filteredTrades.length === 0) {
      alert("No trades to export for this date range.");
      return;
    }

    // 1. Define the CSV headers
    const headers = [
      "Trade ID", "Date", "Side", "Outcome", "Instrument Type", 
      "Symbol", "Market", "Schedule", "Strategy", "P&L ($)", "Notes"
    ];

    // 2. Map the data to rows (escaping commas and quotes in notes)
    const rows = analytics.filteredTrades.map((t) => {
      const escapedNotes = t.notes ? `"${t.notes.replace(/"/g, '""')}"` : '""';
      return [
        t.id, t.trade_date, t.side, t.outcome, t.instrument_type,
        t.instrument_symbol, t.market_type, t.schedule, t.strategy_code,
        t.pnl_usd, escapedNotes
      ];
    });

    // 3. Combine headers and rows into a single string
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    // 4. Create a Blob and trigger the download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trading_journal_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
// --------- Analytics ---------
    const analytics = useMemo(() => {
      
 

    // 2. Base calculations
    const net = filteredTrades.reduce((a, t) => a + Number(t.pnl_usd), 0);
    const wins = filteredTrades.filter((t) => t.outcome === 'TP'); // Only count TPs as wins
    const losses = filteredTrades.filter((t) => t.outcome === 'SL'); // Only count SLs as losses
    const winRate = filteredTrades.length ? (wins.length / filteredTrades.length) * 100 : 0;
    const avgWin = wins.length ? wins.reduce((a, t) => a + Number(t.pnl_usd), 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((a, t) => a + Number(t.pnl_usd), 0) / losses.length : 0;

    // 3. Profit Factor calculation
    const grossWins = wins.reduce((a, t) => a + Number(t.pnl_usd), 0);
    const grossLosses = Math.abs(losses.reduce((a, t) => a + Number(t.pnl_usd), 0));
    const profitFactor = grossLosses > 0 ? (grossWins / grossLosses).toFixed(2) : (grossWins > 0 ? "∞" : "0.00");

    // Chronological sorting for equity curve and drawdown
    const sorted = [...filteredTrades].sort((a, b) =>
      a.trade_date === b.trade_date ? a.id - b.id : a.trade_date.localeCompare(b.trade_date)
    );

    let running = 0;
    let peak = 0;           
    let maxDrawdown = 0;    
    
    const cumulativeByDay: { date: string; cumulative: number }[] = [];
    const dayMap = new Map<string, number>();

    for (const t of sorted) {
      running += Number(t.pnl_usd);
      
      // Update Peak and Drawdown
      if (running > peak) peak = running;
      const drawdown = running - peak;
      if (drawdown < maxDrawdown) maxDrawdown = drawdown;

      dayMap.set(t.trade_date, running);
    }

    for (const [date, cumulative] of dayMap.entries()) {
      cumulativeByDay.push({ date, cumulative: Number(cumulative.toFixed(2)) });
    }

    // Side-based calculations (BUY vs SELL)
    const buyTrades = filteredTrades.filter((t) => t.side === "BUY");
    const sellTrades = filteredTrades.filter((t) => t.side === "SELL");
    const buyNet = buyTrades.reduce((a, t) => a + Number(t.pnl_usd), 0);
    const sellNet = sellTrades.reduce((a, t) => a + Number(t.pnl_usd), 0);
    const buyWinRate = buyTrades.length ? (buyTrades.filter((t) => Number(t.pnl_usd) > 0).length / buyTrades.length) * 100 : 0;
    const sellWinRate = sellTrades.length ? (sellTrades.filter((t) => Number(t.pnl_usd) > 0).length / sellTrades.length) * 100 : 0;

    const sideBars = [
      { side: "BUY", net: Number(buyNet.toFixed(2)), winRate: Number(buyWinRate.toFixed(1)), trades: buyTrades.length },
      { side: "SELL", net: Number(sellNet.toFixed(2)), winRate: Number(sellWinRate.toFixed(1)), trades: sellTrades.length },
    ];

    // 4. NEW: Strategy Performance Breakdown
    const strategyStatsMap = new Map<string, { code: string; count: number; wins: number; net: number }>();
    
    for (const t of filteredTrades) {
      const code = t.strategy_code;
      if (!strategyStatsMap.has(code)) {
        strategyStatsMap.set(code, { code, count: 0, wins: 0, net: 0 });
      }
      const stat = strategyStatsMap.get(code)!;
      stat.count += 1;
      const pnl = Number(t.pnl_usd);
      stat.net += pnl;
      if (pnl > 0) stat.wins += 1;
    }

    const strategyPerformance = Array.from(strategyStatsMap.values())
      .map((s) => ({
        ...s,
        winRate: s.count > 0 ? ((s.wins / s.count) * 100).toFixed(1) : "0.0",
        netFormatted: s.net.toFixed(2),
      }))
      .sort((a, b) => b.net - a.net); // Sort by highest profit at the top

    return {
      net, count: filteredTrades.length, wins: wins.length, losses: losses.length,
      winRate: Number(winRate.toFixed(1)), avgWin: Number(avgWin.toFixed(2)), avgLoss: Number(avgLoss.toFixed(2)),
      profitFactor, maxDrawdown: Math.abs(maxDrawdown).toFixed(2), 
      cumulativeByDay, sideBars, filteredTrades, 
      strategyPerformance // <-- Now included securely in the return
    };
  }, [trades, accountMode, selectedYear, selectedMonth]);

  // ---------- Strategy Specific Chart Data ----------
  const strategyChartData = useMemo(() => {
    if (!selectedStrategy) return [];
    
    // Only get trades for the selected strategy
    const strTrades = analytics.filteredTrades.filter((t) => t.strategy_code === selectedStrategy);
    
    const sorted = [...strTrades].sort((a, b) =>
      a.trade_date === b.trade_date ? a.id - b.id : a.trade_date.localeCompare(b.trade_date)
    );

    let running = 0;
    const dayMap = new Map<string, number>();

    for (const t of sorted) {
      running += Number(t.pnl_usd);
      dayMap.set(t.trade_date, running);
    }

    const cumByDay: { date: string; cumulative: number }[] = [];
    for (const [date, cumulative] of dayMap.entries()) {
      cumByDay.push({ date, cumulative: Number(cumulative.toFixed(2)) });
    }
    
    return cumByDay;
  }, [analytics.filteredTrades, selectedStrategy]);
  // 2. Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [analytics.filteredTrades, selectedStrategy]);
 // ---------- Calendar Data ----------
  const calendarData = useMemo(() => {
    const dailyPnl = new Map<string, number>();
    const dailyTrades = new Map<string, number>();
    
    // Calculate P&L for every single trade
    trades.forEach((t) => {
      const pnl = Number(t.pnl_usd) || 0;
      dailyPnl.set(t.trade_date, (dailyPnl.get(t.trade_date) || 0) + pnl);
      dailyTrades.set(t.trade_date, (dailyTrades.get(t.trade_date) || 0) + 1);
    });

    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0 (Sun) to 6 (Sat)
    
    // Create empty filler boxes for the days before the 1st of the month
    const blanks = Array.from({ length: firstDayOfWeek }).map((_, i) => null);
    
    // Create the actual days
    const days = Array.from({ length: daysInMonth }).map((_, i) => {
      const dayNum = i + 1;
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      return {
        dayNum,
        dateStr,
        pnl: dailyPnl.get(dateStr) || 0,
        tradesCount: dailyTrades.get(dateStr) || 0,
      };
    });

    return { blanks, days };
  }, [trades, calMonth, calYear]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
 // --- SMART STRATEGY ALERTS ---
  // Scan for strategies that have at least 3 trades and a win rate below 40%
  const underperformingstrategies = analytics.strategyPerformance.filter(
    (s) => s.count >= 3 && Number(s.winRate) < 40
  );

  return (
    <div className="tj-bg">
    {/* NEW: Top Navigation Bar with Market Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", width: "100%", maxWidth: "1200px", margin: "0 auto 20px auto" }}>
        
        {/* Market Status Badge */}
        <div style={{ 
          display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", 
          background: isMarketOpen ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)", 
          border: isMarketOpen ? "1px solid rgba(34, 197, 94, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)", 
          borderRadius: "8px", color: isMarketOpen ? "#22c55e" : "#ef4444", 
          fontWeight: "800", fontSize: "12px", letterSpacing: "1px" 
        }}>
          <div style={{ 
            width: "8px", height: "8px", borderRadius: "50%", 
            background: isMarketOpen ? "#22c55e" : "#ef4444", 
            boxShadow: isMarketOpen ? "0 0 10px #22c55e" : "0 0 10px #ef4444" 
          }}></div>
          {isMarketOpen ? "MARKET OPEN" : "MARKET CLOSED"}
        </div>

        {/* Action Buttons Container */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => window.location.href = "/settings"}
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s" }}
          >
            ⚙️ Settings
          </button>

          <button
            onClick={handleLogout}
            style={{
              background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "14px", transition: "all 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"}
            onMouseOut={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
          >
            TERMINATE SESSION
          </button>
        </div>

      </div>

      {/* --- Dashboard Title & User Info (Restored) --- */}
      <div className="tj-card">
        <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "8px", color: "#fff" }}>Trading Dashboard</h2>
        <div style={{ marginBottom: "20px", color: "#9ca3af", fontSize: "14px" }}>
          Logged in as: <span style={{ color: "#fff", fontWeight: 600 }}>{email}</span>
        </div>
{/* --- ACCOUNT METRICS SUMMARY --- */}
       {accountMode === "REAL" && (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "16px", 
          marginTop: "24px",
          marginBottom: "10px"
        }}>
          {/* Box 1: Starting Capital */}
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ color: "#9ca3af", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
              Starting Capital
            </div>
            <div style={{ color: "#fff", fontSize: "24px", fontWeight: 800 }}>
              ${startingCapital.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Box 2: Total Net Profit */}
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ color: "#9ca3af", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
              Total Net Profit
            </div>
            <div style={{ color: totalNetProfit >= 0 ? "#22c55e" : "#ef4444", fontSize: "24px", fontWeight: 800 }}>
              {totalNetProfit >= 0 ? "+" : "-"}${Math.abs(totalNetProfit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Box 3: Current Balance */}
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", position: "relative", overflow: "hidden" }}>
            {/* Subtle glow effect for the balance box */}
            <div style={{ position: "absolute", top: "-50%", left: "-50%", width: "200%", height: "200%", background: "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)", zIndex: 0 }}></div>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ color: "#9ca3af", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
                Current Balance
              </div>
              <div style={{ color: "#fff", fontSize: "24px", fontWeight: 800 }}>
                ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
     )}
      {/* --- PHASE 3: ACCOUNT SWITCHER --- */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          <button 
            onClick={() => setAccountMode("REAL")}
            style={{ 
              flex: 1, 
              padding: "10px", 
              borderRadius: "8px", 
              fontWeight: 800, 
              fontSize: "12px",
              cursor: "pointer",
              border: accountMode === "REAL" ? "2px solid #16a34a" : "1px solid #333",
              background: accountMode === "REAL" ? "rgba(22, 163, 74, 0.1)" : "#000",
              color: accountMode === "REAL" ? "#16a34a" : "#9ca3af",
              transition: "all 0.2s"
            }}
          >
            LIVE REAL ACCOUNT
          </button>
          <button 
            onClick={() => setAccountMode("PLAYBACK")}
            style={{ 
              flex: 1, 
              padding: "10px", 
              borderRadius: "8px", 
              fontWeight: 800, 
              fontSize: "12px",
              cursor: "pointer",
              border: accountMode === "PLAYBACK" ? "2px solid #3b82f6" : "1px solid #333",
              background: accountMode === "PLAYBACK" ? "rgba(59, 130, 246, 0.1)" : "#000",
              color: accountMode === "PLAYBACK" ? "#3b82f6" : "#9ca3af",
              transition: "all 0.2s"
            }}
          >
            PLAYBACK PRACTICE
          </button>
        </div>
  
        {/* SMART STRATEGY WARNING BANNER */}
{underperformingStrategies.length > 0 && (
  <div style={{
    background: "rgba(239, 68, 68, 0.05)",
    border: "1px solid #ef4444",
    padding: "16px",
    borderRadius: "12px",
    marginBottom: "24px",
    display: "flex",
    alignItems: "center",
    gap: "16px"
  }}>
    <div style={{ fontSize: "24px" }}>⚠️</div>
    <div>
      <div style={{ color: "#ef4444", fontWeight: 800, fontSize: "14px", marginBottom: "4px" }}>
        STRATEGY BLEED ALERT ({accountMode})
      </div>
      <div style={{ color: "#fca5a5", fontSize: "13px" }}>
        Your win rate is critical on: <strong>{underperformingStrategies.map(s => s.name).join(", ")}</strong>. 
        Review your rules before trading these setups again in {accountMode} mode.
      </div>
    </div>
  </div>
)}

        {/* --- COMMAND CENTER --- */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px", alignItems: "start", marginBottom: "32px" }}>
          
          {/* LEFT COLUMN: The Pro Form */}
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "24px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
  <h2 style={{ fontSize: "18px", color: "#a5b4fc", fontWeight: 700, margin: 0 }}>Add New Trade</h2>
  
  {/* The Hidden File Input and the Data Management Buttons */}
  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
    <input 
      type="file" 
      accept=".csv" 
      onChange={handleFileUpload} 
      style={{ display: 'none' }} 
      id="csv-upload" 
    />
    
    {/* 1. The Import Button */}
    <label 
      htmlFor="csv-upload" 
      style={{ 
        cursor: 'pointer', 
        background: "rgba(59, 130, 246, 0.1)", 
        color: "#3b82f6", 
        border: "1px solid #3b82f6",
        padding: "8px 16px", 
        borderRadius: "8px", 
        fontSize: "12px",
        fontWeight: "bold",
        transition: "all 0.2s"
      }}
    >
      {isImporting ? "⏳ IMPORTING..." : "📥 IMPORT CSV"}
    </label>

    {/* 2. The Clean Slate Button */}
    <button
  onClick={handleCleanSlate}
  disabled={isImporting}
  style={{
    background: "rgba(239, 68, 68, 0.05)", // Very faint red
    color: "#f87171",                   // Soft red text
    border: "1px solid rgba(239, 68, 68, 0.4)",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.2s"
  }}
>
  {isImporting ? "WAIT..." : `🗑️ WIPE ${accountMode}`}
</button>
  </div>
</div> {/* This closing div corresponds to the flex header on line 875 */}
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
              {/* Row 1 */}
              <div><label style={{ fontSize: "12px", color: "#9ca3af" }}>Date</label><input type="date" value={tradeDate} onChange={(e) => setTradeDate(e.target.value)} style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px" }} /></div>
              <div><label style={{ fontSize: "12px", color: "#9ca3af" }}>Side</label>
                <select value={side} onChange={(e) => setSide(e.target.value as "BUY" | "SELL")} style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px" }}>
                  <option value="BUY">BUY</option><option value="SELL">SELL</option>
                </select>
              </div>
              <div><label style={{ fontSize: "12px", color: "#9ca3af" }}>Outcome</label>
                <select value={outcome} onChange={(e) => setOutcome(e.target.value as "TP" | "SL" | "BE")} style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px" }}>
                  <option value="TP">TP</option><option value="SL">SL</option><option value="BE">BE</option>
                </select>
              </div>

              {/* Row 2 */}
              <div><label style={{ fontSize: "12px", color: "#9ca3af" }}>Inst. Type</label>
                <select value={instrumentType} onChange={(e) => setInstrumentType(e.target.value)} style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px" }}>
                  <option value="Future">Future</option><option value="Stock">Stock</option><option value="Forex">Forex</option><option value="Crypto">Crypto</option>
                </select>
              </div>
              <div><label style={{ fontSize: "12px", color: "#9ca3af" }}>Symbol</label><input value={instrumentSymbol} onChange={(e) => setInstrumentSymbol(e.target.value)} placeholder="MNQ..." style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px" }} /></div>
              <div><label style={{ fontSize: "12px", color: "#9ca3af" }}>P&L ($)</label><input type="number" value={pnlUsd} onChange={(e) => setPnlUsd(Number(e.target.value))} style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px" }} /></div>
<div style={{ display: 'flex', flexDirection: 'column' }}>
  <label style={{ fontSize: "12px", color: "#9ca3af" }}>Risk %</label>
  <input 
    type="number" 
    step="0.1" 
    value={riskPercentage} 
    onChange={(e) => setRiskPercentage(Number(e.target.value))} 
    style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px" }} 
  />
</div>
{/* --- RESTORED PSYCHOLOGY DROPDOWN --- */}
<div style={{ display: 'flex', flexDirection: 'column' }}>
  <label style={{ fontSize: "12px", color: "#9ca3af" }}>Psychology</label>
  <select 
    value={psychology} 
    onChange={(e) => setPsychology(e.target.value)} 
    style={{ 
      width: "100%", 
      padding: "8px", 
      background: "#000", 
      border: "1px solid #333", 
      color: "#fff", 
      borderRadius: "4px" 
    }}
  >
    {/* This maps through your PSYCHOLOGY_OPTIONS array */}
    {PSYCHOLOGY_OPTIONS.map((opt) => (
      <option key={opt} value={opt}>{opt}</option>
    ))}
  </select>
</div>

{/* Market Type Restored */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "12px", color: "#9ca3af" }}>Market</label>
            <select 
              value={marketType} 
              onChange={(e) => setMarketType(e.target.value)} 
              style={{ 
                padding: "10px", 
                background: "#000", 
                border: "1px solid #333", 
                color: "#fff", 
                borderRadius: "4px", 
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="Asia">Asia</option>
              <option value="London">London</option>
              <option value="NY">New York (NY)</option>
            </select>
          </div>
 {/* Schedule (Time of Day) Restored */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "12px", color: "#9ca3af" }}>Schedule</label>
            <select 
              value={schedule} 
              onChange={(e) => setSchedule(e.target.value)} 
              style={{ 
                padding: "10px", 
                background: "#000", 
                border: "1px solid #333", 
                color: "#fff", 
                borderRadius: "4px", 
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Overnight">Overnight</option>
            </select>
          </div>        
            <div style={{ gridColumn: "span 3" }}>
  <label style={{ fontSize: "12px", color: "#9ca3af" }}>Strategy</label>
  <input
    type="text"
    value={strategyCode}
    onChange={(e) => setStrategyCode(e.target.value.toUpperCase())}
    style={{ 
      width: "100%", 
      padding: "8px", 
      background: "#000", 
      border: "1px solid #333", 
      color: "#fff", 
      borderRadius: "4px" 
    }}
    placeholder="Enter Strategy (e.g., BUY_T5T1_TOOK_MIN)"
  />
</div>

              {/* Row 4 - Full Width Notes (Fixed Styling) */}
              <div style={{ gridColumn: "span 3" }}>
                <label style={{ fontSize: "12px", color: "#9ca3af" }}>Detailed Notes & Analysis</label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  rows={4} 
                  placeholder="Record your setups, confluences, thoughts..."
                  style={{ width: "100%", padding: "12px", background: "#000", color: "#fff", border: "1px solid #333", borderRadius: "6px", fontFamily: "inherit", resize: "vertical" }} 
                />
              </div>

              {/* Row 5 - Image Upload */}
              <div style={{ gridColumn: "span 3", background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "6px", border: "1px dashed #444" }}>
                <label style={{ fontSize: "11px", color: "#a5b4fc", display: "block", marginBottom: "4px" }}>📷 Attach Trade Screenshot</label>
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} style={{ fontSize: "12px", color: "#fff" }} />
              </div>
            </div>

{/* Reduced & Centered Action Button */}
            <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: "16px" }}>
            <button
              onClick={saveTrade}
              style={{
                width: "180px",
                background: editingId ? "#3b82f6" : "#16a34a",
                color: "#fff",
                padding: "12px 0",
                borderRadius: 8,
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                transition: "all 0.2s ease"
              }}
              onMouseOver={(e) => (e.currentTarget.style.filter = "brightness(1.2)")}
              onMouseOut={(e) => (e.currentTarget.style.filter = "brightness(1.0)")}
            >
              {editingId ? "UPDATE TRADE" : "ADD TRADE"}
            </button>

            {/* THE MISSING CANCEL BUTTON */}
            {editingId && (
              <button
                onClick={() => {
                  setEditingId(null);
                  // Note: If your old cancel button cleared the text boxes, 
                  // you can add those reset functions here (e.g., setSymbol(""), setPnl(""), etc.)
                }}
                style={{
                  width: "180px",
                  background: "transparent",
                  color: "#ef4444",
                  padding: "12px 0",
                  borderRadius: 8,
                  fontWeight: 800,
                  border: "1px solid #ef4444",
                  cursor: "pointer",
                  fontSize: "14px",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                CANCEL UPDATE
              </button>
            )}
          </div>
          </div>
          {/* RIGHT COLUMN: Neon Stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Capital Input (Unlimited Goal!) */}
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "12px", border: "1px solid #333" }}>
              <label style={{ fontSize: "11px", color: "#9ca3af", display: "block", marginBottom: "4px" }}>💰 STARTING CAPITAL</label>
              <input 
                type="number" 
                value={startingCapital} 
                onChange={(e) => setStartingCapital(Number(e.target.value))} 
                style={{ background: "transparent", border: "none", color: "#fff", fontSize: "24px", fontWeight: 900, width: "100%", outline: "none" }} 
              />
            </div>

            {/* Glowing Live Balance */}
            <div style={{ background: "#000", padding: "20px", borderRadius: "12px", border: "2px solid #eab308", boxShadow: "0 0 20px rgba(234, 179, 8, 0.25)", textAlign: "center" }}>
              <div style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 600 }}>LIVE ACCOUNT BALANCE</div>
              <div style={{ fontSize: "32px", fontWeight: 900, color: "#eab308" }}>
                ${(startingCapital + analytics.net).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Performance Widgets */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ background: "#000", padding: "20px", borderRadius: "12px", border: "2px solid #10b981", boxShadow: "0 0 15px rgba(16, 185, 129, 0.2)", textAlign: "center" }}>
                <div style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 600 }}>NET P&L</div>
                <div style={{ fontSize: "24px", fontWeight: 900, color: analytics.net >= 0 ? "#10b981" : "#ef4444" }}>
                  {analytics.net >= 0 ? "+" : ""}${Number(analytics.net).toLocaleString()}
                </div>
              </div>
              <div style={{ background: "#000", padding: "20px", borderRadius: "12px", border: "2px solid #3b82f6", boxShadow: "0 0 15px rgba(59, 130, 246, 0.2)", textAlign: "center" }}>
                <div style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 600 }}>WIN RATE</div>
                <div style={{ fontSize: "24px", fontWeight: 900, color: "#3b82f6" }}>{analytics.winRate}%</div>
              </div>
              {/* Strategy Spotlight Card (RESTORED) */}
            <div style={{ background: "#0b0b0b", padding: "20px", borderRadius: "12px", border: "2px solid #a5b4fc", boxShadow: "0 0 20px rgba(165, 180, 252, 0.15)" }}>
              <div style={{ color: "#9ca3af", fontSize: "12px", fontWeight: 600, marginBottom: "8px" }}>🏆 TOP STRATEGY</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#fff" }}>{analytics.strategyPerformance[0]?.code || "N/A"}</div>
                <div style={{ fontSize: "22px", fontWeight: 900, color: "#10b981" }}>{analytics.strategyPerformance[0]?.winRate}%</div>
              </div>
            </div>
            </div>
          </div>
        </div>

        <hr style={{ margin: "18px 0" }} />

        {/* -------- Charts -------- */}
       {/* -------- Filter & Analytics Header -------- */}
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Analytics</h3>
          {/* NEW: Year Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 16 }}>
            <span style={{ color: "#9ca3af", fontSize: 14, fontWeight: 600 }}>Year:</span>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{ background: "#222", color: "#fff", border: "1px solid #444", borderRadius: 4, padding: "4px 8px", cursor: "pointer" }}
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="All">All Time</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Export Button */}
            <button 
              onClick={exportToCSV}
              style={{ padding: "8px 16px", fontSize: 13, background: "#08306b", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
            >
              📥 Export CSV
            </button>

            {/* Filter Bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(20,20,20,0.8)", padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 600 }}>Filter:</span>
              
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label style={{ fontSize: 12, color: "#9ca3af" }}>Start</label>
                <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} style={{ padding: "4px 8px", borderRadius: 4, background: "#000", color: "#fff", border: "1px solid #333", fontSize: 13 }} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label style={{ fontSize: 12, color: "#9ca3af" }}>End</label>
                <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} style={{ padding: "4px 8px", borderRadius: 4, background: "#000", color: "#fff", border: "1px solid #333", fontSize: 13 }} />
              </div>

              {(filterStartDate || filterEndDate) && (
                <button onClick={() => { setFilterStartDate(""); setFilterEndDate(""); }} style={{ padding: "4px 10px", fontSize: 12, background: "#ef4444", border: "none", color: "#fff", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>Cumulative P&L ($) vs Date</div>
            <div style={{ width: "100%", height: 280, overflow: "visible" }}>
               {/* Extracted massive inline code and replaced with component */}
               <EquityChart data={analytics.cumulativeByDay} height={280} />
            </div>
          </div>

          <div style={{ border: "1px solid #222", borderRadius: 12, padding: 12, background: "rgba(20,20,20,0.95)" }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>BUY vs SELL Performance</div>
            <div style={{ width: "100%", height: 320 }}>
               {/* Passed correct prop name (sideBars) instead of 'data' */}
               <ThreeDBarChart sideBars={analytics.sideBars} height={320} />
            </div>
          </div>
        </div>
{/* -------- Strategy Performance Table -------- */}
        <h3 style={{ marginTop: 24, marginBottom: 12 }}>Strategy Performance</h3>
        <div style={{ background: "rgba(20,20,20,0.95)", border: "1px solid #333", borderRadius: 12, padding: "8px 16px", overflowX: "auto" }}>
          <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", fontSize: 14 }}>
           <thead>
              <tr style={{ borderBottom: "1px solid #444", color: "#9ca3af" }}>
                <th style={{ padding: "12px 8px", fontWeight: 600 }}>Strategy Code</th>
                <th style={{ padding: "12px 8px", fontWeight: 600 }}>Trades</th>
                <th style={{ padding: "12px 8px", fontWeight: 600 }}>Win Rate</th>
                <th style={{ padding: "12px 8px", fontWeight: 600 }}>Net P&L</th>
                <th style={{ padding: "12px 8px", fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {analytics.strategyPerformance.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#666" }}>No data for selected dates.</td>
                </tr>
              ) : (
                analytics.strategyPerformance.map((strat) => (
                  <tr key={strat.code} style={{ borderBottom: "1px solid #222" }}>
                    <td style={{ padding: "12px 8px", color: "#e5e7eb" }}>{strat.code}</td>
                    <td style={{ padding: "12px 8px" }}>{strat.count}</td>
                    <td style={{ padding: "12px 8px" }}>{strat.winRate}%</td>
                    <td style={{ 
                      padding: "12px 8px", 
                      fontWeight: 800,
                      color: strat.net > 0 ? "#22c55e" : strat.net < 0 ? "#ef4444" : "#9ca3af" 
                    }}>
                      {strat.net > 0 ? "+" : ""}${strat.netFormatted}
                    </td>
                    <td style={{ padding: "12px 8px", display: "flex", gap: "8px" }}>
  {/* Existing View Chart Button */}
  <button
    onClick={() => setSelectedStrategy(strat.code === selectedStrategy ? null : strat.code)}
    style={{
      background: selectedStrategy === strat.code ? "#08306b" : "#333",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.1)",
      padding: "4px 12px",
      borderRadius: 6,
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 600
    }}
  >
    {selectedStrategy === strat.code ? "Hide Chart" : "View Chart"}
  </button>

  {/* NEW Rename Button */}
  <button
    onClick={() => {
      const newName = prompt("Enter new name for this strategy:", strat.code);
      if (newName && newName.toUpperCase() !== strat.code) {
        renameStrategy(strat.code, newName.toUpperCase());
      }
    }}
    style={{
      background: "transparent",
      color: "#9ca3af",
      border: "1px solid #333",
      borderRadius: 6,
      padding: "4px 12px",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer"
    }}
  >
    Rename
  </button>
</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* -------- Selected Strategy Chart -------- */}
        {selectedStrategy && (
          <div style={{ marginTop: 16, border: "1px solid #08306b", borderRadius: 12, padding: 16, background: "rgba(8, 48, 107, 0.15)" }}>
            <div style={{ marginBottom: 16, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ color: "#9ca3af" }}>Analyzing Strategy: </span> 
                <span style={{ color: "#60a5fa", fontSize: 16 }}>{selectedStrategy}</span>
              </div>
              <button 
                onClick={() => setSelectedStrategy(null)} 
                style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 16 }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ width: "100%", height: 260 }}>
               {strategyChartData.length > 0 ? (
                 <EquityChart data={strategyChartData} height={260} />
               ) : (
                 <div style={{ color: "#666", textAlign: "center", paddingTop: 100 }}>Not enough data to plot curve.</div>
               )}
            </div>
          </div>
        )}
        <hr style={{ margin: "18px 0" }} />


       
       
        {/* -------- Calendar View (Collapsible) -------- */}
        {accountMode === "REAL" && (
        <div style={{ marginTop: 32 }}>
          {/* Toggle Button */}
          <button
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            style={{
              width: "100%", padding: "14px 20px", background: "rgba(20,20,20,0.95)", color: "#e5e7eb",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 16,
              fontWeight: 600, cursor: "pointer", display: "flex", justifyContent: "space-between",
              alignItems: "center", transition: "all 0.2s ease"
            }}
          >
            <span>📅 Monthly Performance Calendar</span>
            <span style={{ fontSize: 14, color: "#9ca3af" }}>
              {isCalendarOpen ? "▲ Hide Calendar" : "▼ View Calendar"}
            </span>
          </button>

          {/* Expandable Content */}
          {isCalendarOpen && (
            <div style={{ marginTop: 12, background: "rgba(20,20,20,0.95)", border: "1px solid #333", borderRadius: 12, padding: 20 }}>
              
              {/* Calendar Header & Controls */}
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button 
                    onClick={() => { if(calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); }} 
                    style={{ background: "#333", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
                  >
                    ← Prev
                  </button>
                  <span style={{ fontWeight: 800, fontSize: 16, minWidth: 140, textAlign: "center", color: "#60a5fa" }}>
                    {monthNames[calMonth]} {calYear}
                  </span>
                  <button 
                    onClick={() => { if(calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); }} 
                    style={{ background: "#333", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
                  >
                    Next →
                  </button>
                </div>
              </div>

              {/* Days of the Week */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, textAlign: "center", marginBottom: 8, fontWeight: 600, color: "#9ca3af", fontSize: 13 }}>
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
              </div>

              {/* Calendar Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                
                {/* Empty boxes for start of month padding */}
                {calendarData.blanks.map((_, i) => (
                  <div key={`blank-${i}`} style={{ minHeight: 80, background: "rgba(255,255,255,0.02)", borderRadius: 8 }}></div>
                ))}
                
                {/* Actual Days */}
                {calendarData.days.map((d) => {
                  const isProfit = d.pnl > 0;
                  const isLoss = d.pnl < 0;
                  
                  // Dynamic colors based on performance!
                  const bgColor = isProfit ? "rgba(34, 197, 94, 0.15)" : isLoss ? "rgba(239, 68, 68, 0.15)" : "rgba(255,255,255,0.03)";
                  const borderColor = isProfit ? "rgba(34, 197, 94, 0.4)" : isLoss ? "rgba(239, 68, 68, 0.4)" : "rgba(255,255,255,0.08)";
                  const textColor = isProfit ? "#4ade80" : isLoss ? "#f87171" : "#6b7280";

                  return (
                    <div key={d.dateStr} style={{ minHeight: 80, background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 8, padding: "8px 10px", display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "all 0.2s" }}>
                      <div style={{ fontSize: 13, color: d.tradesCount > 0 ? "#fff" : "#666", fontWeight: 700, textAlign: "left" }}>
                        {d.dayNum}
                      </div>
                      
                      {/* Only show P&L if they actually took a trade that day */}
                      {d.tradesCount > 0 ? (
                        <div style={{ textAlign: "right", marginTop: 4 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: textColor }}>
                            {isProfit ? "+" : ""}${d.pnl.toFixed(0)}
                          </div>
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, fontWeight: 600 }}>
                            {d.tradesCount} trade{d.tradesCount > 1 ? "s" : ""}
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: "right", fontSize: 12, color: "#444", fontWeight: 600 }}>-</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
     )}
     {/* -------- Strategy Performance Leaderboard -------- */}
<div style={{ marginBottom: '32px' }}>
  {/* 1. The Header with the Toggle Button (Perfectly Proportioned) */}
<div 
  onClick={() => setIsLeaderboardOpen(!isLeaderboardOpen)}
  style={{ 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    background: "rgba(20, 20, 20, 0.95)", 
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: "8px",
    padding: "18px 20px", /* Increased to match the height of the other bars exactly */
    marginBottom: "16px",
    cursor: "pointer"
  }}
>
  <div style={{ color: '#e5e7eb', fontSize: '16px', fontWeight: 'bold', fontFamily: 'sans-serif, system-ui' }}>
    🏆 Strategy Leaderboard
  </div>
    <div style={{ color: "#9ca3af", fontSize: "14px", fontWeight: "bold" }}>
    {isLeaderboardOpen ? "▲ Hide List" : "▼ Show List"}
  </div>
</div>

{/* 2. The Opening Bracket to hide the table */}
{isLeaderboardOpen && (
  <div style={{ 
    background: "rgba(20,20,20,0.95)", 
    borderRadius: '8px', 
    border: "1px solid rgba(255,255,255,0.05)",
    overflow: 'hidden' 
  }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <thead style={{ background: 'rgba(255,255,255,0.02)', color: '#9ca3af', fontSize: '12px', textTransform: 'uppercase' }}>
        <tr>
          {/* We set explicit widths here so they match your rows below */}
          <th style={{ padding: '12px 16px', textAlign: 'left', width: '40%' }}>Strategy</th>
          <th style={{ padding: '12px 16px', textAlign: 'center', width: '20%' }}>Win Rate</th>
          <th style={{ padding: '12px 16px', textAlign: 'center', width: '25%' }}>Total P&L</th>
          <th style={{ padding: '12px 16px', textAlign: 'right', width: '15%' }}>Trades</th>
        </tr>
      </thead>
      <tbody style={{ color: '#e5e7eb', fontSize: '14px' }}>
        {getStrategyStats().map((s) => (
  <tr 
    key={s.name}
    onClick={() => setSelectedStrategy(s.name === selectedStrategy ? null : s.name)}
    style={{ 
      cursor: 'pointer',
      background: selectedStrategy === s.name ? "rgba(165, 180, 252, 0.1)" : "transparent" 
    }}
  >
    <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{s.name}</td>
    <td style={{ padding: '12px 16px', textAlign: 'center' }}>{s.winRate}%</td>
    <td style={{ padding: '12px 16px', textAlign: 'center', color: s.pnl >= 0 ? '#4ade80' : '#fb7185' }}>
      ${s.pnl.toFixed(2)}
    </td>
    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#9ca3af' }}>{s.total} trades</td>
  </tr>
))}
      </tbody>
    </table>
  </div>
)}
</div>
              
         {/* --- YEAR & MONTH FILTERS --- */}
<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
  
  {/* Year Dropdown */}
  <select 
    value={selectedYear} 
    onChange={(e) => setSelectedYear(e.target.value)}
    style={{ 
      background: "rgba(20,20,20,0.95)", 
      color: "#e5e7eb", 
      border: "1px solid rgba(255,255,255,0.1)", 
      padding: "8px 16px", 
      borderRadius: "6px",
      fontSize: "14px",
      cursor: "pointer",
      outline: "none"
    }}
  >
    <option value="ALL">All Years</option>
    <option value="2026">2026</option>
    <option value="2025">2025</option>
    <option value="2024">2024</option>
  </select>

  {/* Month Dropdown */}
  <select 
    value={selectedMonth} 
    onChange={(e) => setSelectedMonth(e.target.value)}
    disabled={selectedYear === "ALL"} // Smart feature: Only unlocks if a year is chosen!
    style={{ 
      background: "rgba(20,20,20,0.95)", 
      color: selectedYear === "ALL" ? "#4b5563" : "#e5e7eb", 
      border: "1px solid rgba(255,255,255,0.1)", 
      padding: "8px 16px", 
      borderRadius: "6px",
      fontSize: "14px",
      cursor: selectedYear === "ALL" ? "not-allowed" : "pointer",
      outline: "none"
    }}
  >
    <option value="ALL">All Months</option>
    <option value="01">January</option>
    <option value="02">February</option>
    <option value="03">March</option>
    <option value="04">April</option>
    <option value="05">May</option>
    <option value="06">June</option>
    <option value="07">July</option>
    <option value="08">August</option>
    <option value="09">September</option>
    <option value="10">October</option>
    <option value="11">November</option>
    <option value="12">December</option>
  </select>

</div>   
{selectedStrategy && (
  <div 
    onClick={() => setSelectedStrategy(null)}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      background: "rgba(165, 180, 252, 0.1)",
      color: "#a5b4fc",
      padding: "4px 10px",
      borderRadius: "12px",
      fontSize: "11px",
      fontWeight: "bold",
      cursor: "pointer",
      border: "1px solid rgba(165, 180, 252, 0.3)",
      marginLeft: "10px"
    }}
  >
    STRATEGY: {selectedStrategy} ✕
  </div>
)}
        {/* -------- Trades list -------- */}
     {/* -------- Trades list (Collapsible & Paginated) -------- */}
      <div style={{ marginTop: 32, marginBottom: 40 }}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsTradesListOpen(!isTradesListOpen)}
          style={{
            width: "100%", padding: "14px 20px", background: "rgba(20,20,20,0.95)", color: "#e5e7eb",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 16,
            fontWeight: 600, cursor: "pointer", display: "flex", justifyContent: "space-between",
            alignItems: "center", transition: "all 0.2s ease"
          }}
        >
          <span>{selectedStrategy ? `Your Trades: ${selectedStrategy}` : "Your Trades History"}</span>
          <span style={{ fontSize: 14, color: "#9ca3af" }}>
            {isTradesListOpen ? "▲ Hide List" : "▼ View List"}
          </span>
        </button>

        {/* Expandable Content */}
        {isTradesListOpen && (
          
          <div style={{ marginTop: 12, background: "rgba(0,0,0,0.4)", borderRadius: 8, padding: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
         
         {/* Task 3: Neon Filter Buttons */}
<div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
  {['all', 'week', 'month', 'year'].map((range) => (
    <button 
      key={range}
      onClick={() => setRangeFilter(range)}
      style={{
        fontSize: '10px',
        padding: '6px 16px',
        borderRadius: '20px',
        textTransform: 'uppercase',
        fontWeight: '900',
        backgroundColor: rangeFilter === range ? '#3b82f6' : '#111',
        color: rangeFilter === range ? '#fff' : '#666',
        border: '1px solid #333',
        cursor: 'pointer',
        boxShadow: rangeFilter === range ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none'
      }}
    >
      {range}
    </button>
  ))}
</div>
           {(() => {
        const displayTrades = filteredTrades.filter((t) => {
  // 1. Account Mode Filter
  const isPlaybackActive = accountMode === "PLAYBACK";
  const isTradePlayback = (t.account_mode || "").toUpperCase() === "PLAYBACK";
  if (isPlaybackActive && !isTradePlayback) return false;
  if (!isPlaybackActive && isTradePlayback) return false;

  // 2. Strategy Filter
  if (selectedStrategy && t.strategy_code !== selectedStrategy) return false;

  // 3. Time Range Filter (NEW)
  if (rangeFilter !== 'all') {
    const tradeDate = new Date(t.trade_date);
    const now = new Date();
    if (rangeFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      if (tradeDate < oneWeekAgo) return false;
    } else if (rangeFilter === 'month') {
      if (tradeDate.getMonth() !== now.getMonth() || tradeDate.getFullYear() !== now.getFullYear()) return false;
    } else if (rangeFilter === 'year') {
      if (tradeDate.getFullYear() !== now.getFullYear()) return false;
    }
  }

  return true;
}).slice().reverse();

            // 2. Calculate pagination
            const totalPages = Math.ceil(displayTrades.length / tradesPerPage);
            const startIndex = (currentPage - 1) * tradesPerPage;
            const paginatedTrades = displayTrades.slice(startIndex, startIndex + tradesPerPage);

            if (displayTrades.length === 0) {
              return <div style={{ color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>No trades found in {accountMode} mode.</div>;
            }

              return (
                <>
                  {/* The paginated list */}
                  {paginatedTrades.map((t) => {
                    const pnl = Number(t.pnl_usd) || 0;
                    const pnlColor = pnl > 0 ? "#22c55e" : pnl < 0 ? "#ef4444" : "#9ca3af";
                    const sideColor = t.side === "BUY" ? "#22c55e" : "#ef4444";

                  return (
                      <div key={t.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 14 }}>
                        <span style={{ opacity: 0.9 }}>{t.trade_date} |</span>
                        <span style={{ color: sideColor, fontWeight: 700, width: 40 }}>{t.side}</span>
                      <span style={{ opacity: 0.9, flex: 1 }}>| {t.outcome} | {t.instrument_symbol} | {t.market_type} | {t.schedule} | <span style={{ color: "#60a5fa" }}>{t.strategy_code}</span> | <span style={{ color: t.psychology === "FOMO" || t.psychology === "Revenge Trade" || t.psychology === "Overleveraged" ? "#ef4444" : "#a855f7", fontWeight: 600 }}>{t.psychology || "N/A"}</span> |</span>  
                     
                        <span style={{ color: pnlColor, fontWeight: 800, marginRight: 16 }}>
                          {pnl > 0 ? "+" : ""}${pnl.toFixed(2)}
                        </span>
                       <span style={{ color: "#60a5fa", fontWeight: 800, width: 60, marginLeft: 10 }}>{t.risk_percentage}%</span> 
                       {/* Edit, Delete, and Image Actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {t.image_url ? (
            <a href={t.image_url} target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8", fontSize: 12, textDecoration: "none", border: "1px solid #38bdf8", borderRadius: 4, padding: "2px 8px" }}>
              🖼️ View
            </a>
          ) : (
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, padding: "2px 8px" }}>No Img</span>
          )}
          <button onClick={() => startEdit(t)} style={{ background: "transparent", color: "#60a5fa", border: "1px solid #60a5fa", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 12 }}>
            Edit
          </button>
          <button onClick={() => deleteTrade(t.id)} style={{ background: "transparent", color: "#ef4444", border: "1px solid #ef4444", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 12 }}>
            Del
          </button>
        </div>
                      </div>
                    );  
                  })}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        style={{ padding: "8px 16px", borderRadius: 6, fontWeight: 600, fontSize: 13, background: currentPage === 1 ? "#222" : "#333", color: currentPage === 1 ? "#555" : "#fff", border: "1px solid rgba(255,255,255,0.1)", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
                      >
                        ← Previous
                      </button>
                      
                      <span style={{ color: "#9ca3af", fontSize: 13, fontWeight: 600 }}>
                        Page {currentPage} of {totalPages}
                      </span>
                      
                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        style={{ padding: "8px 16px", borderRadius: 6, fontWeight: 600, fontSize: 13, background: currentPage === totalPages ? "#222" : "#333", color: currentPage === totalPages ? "#555" : "#fff", border: "1px solid rgba(255,255,255,0.1)", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}