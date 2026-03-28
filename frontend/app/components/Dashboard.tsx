"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, type PieLabelRenderProps } from "recharts";
import { TrendingUp, Wallet, AlertCircle, ChevronRight, Landmark, Zap, RefreshCw } from "lucide-react";
import type { Card } from "../lib/types";
import {
  MOCK_TRANSACTIONS,
  CATEGORY_META,
  aggregateByCategory,
  totalSpend,
  type Transaction,
} from "../lib/transactions";

// Cards that Plaid would detect in the demo account
export const PLAID_DETECTED_CARD_IDS = ["amex_gold", "chase_sapphire_reserve", "chase_freedom_unlimited"];

interface Props {
  selectedCards: Card[];
  getCreditUsed: (cardId: string, creditId: string) => number;
  onNavigate: (tab: string, opts?: { openROI?: boolean }) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  onTransactionsLoaded?: (txs: Transaction[]) => void;
  onPlaidCardsDetected?: (cardIds: string[]) => void;
  onDemoLoaded?: () => void;
}

const MONTH_BUDGET = 3200;

function fmt(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
}

function relativeDay(dateStr: string) {
  const today = new Date("2026-03-28");
  const d = new Date(dateStr);
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CustomLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props as {
    cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number;
  };
  if (percent < 0.07) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function Dashboard({ selectedCards, getCreditUsed, onNavigate, onTransactionsLoaded, onPlaidCardsDetected, onDemoLoaded }: Props) {
  const [bankConnected, setBankConnected] = useState(false);
  const [showPlaidModal, setShowPlaidModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAllTx, setShowAllTx] = useState(false);

  const activeTx = bankConnected ? transactions : [];
  const spent = totalSpend(activeTx);
  const budgetPct = Math.min(1, spent / MONTH_BUDGET);
  const overBudget = spent > MONTH_BUDGET;
  const byCategory = aggregateByCategory(activeTx);

  const pieData = Object.entries(byCategory)
    .map(([key, value]) => ({
      name: CATEGORY_META[key as keyof typeof CATEGORY_META]?.label ?? key,
      value,
      color: CATEGORY_META[key as keyof typeof CATEGORY_META]?.color ?? "#3d3d55",
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalUnused = selectedCards.reduce(
    (acc, card) => acc + card.credits.reduce((s, cr) => s + Math.max(0, cr.amount - getCreditUsed(card.id, cr.id)), 0),
    0
  );
  const urgentCount = selectedCards.flatMap((c) =>
    c.credits.filter((cr) => cr.frequency === "monthly" && getCreditUsed(c.id, cr.id) < cr.amount)
  ).length;

  const displayTx = showAllTx ? activeTx : activeTx.slice(0, 6);

  function handleConnectBank() {
    setShowPlaidModal(true);
  }

  function handleLoadDemo() {
    setTransactions(MOCK_TRANSACTIONS);
    setBankConnected(true);
    setShowPlaidModal(false);
    onDemoLoaded?.();
    onTransactionsLoaded?.(MOCK_TRANSACTIONS);
    onPlaidCardsDetected?.(PLAID_DETECTED_CARD_IDS);
  }

  return (
    <div className="space-y-5">

      {/* ── Connect Bank / Budget Bar ──────────────────────────────── */}
      {!bankConnected ? (
        <div
          className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ background: "linear-gradient(135deg, rgba(195,109,187,0.08), rgba(143,143,191,0.06))", border: "1px solid rgba(195,109,187,0.2)" }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(195,109,187,0.15)" }}>
              <Landmark size={18} style={{ color: "#c36dbb" }} />
            </div>
            <div>
              <p className="text-white font-semibold mb-0.5">Connect your bank account</p>
              <p className="text-[#777] text-xs leading-relaxed">
                Securely link via Plaid to automatically import transactions and get real-time spending insights.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleConnectBank}
              className="gradient-bg text-white text-sm font-semibold px-5 py-2.5 rounded-xl whitespace-nowrap"
            >
              Connect Bank
            </button>
            <button
              onClick={handleLoadDemo}
              className="glass text-[#999] hover:text-white text-xs px-3 py-2 rounded-xl transition-colors whitespace-nowrap"
            >
              Use demo data
            </button>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#52d9a0]" />
                <p className="text-[#999] text-xs uppercase tracking-widest">March 2026 · Chase ••4521</p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{fmt(spent)}</span>
                <span className="text-[#666] text-sm">of ${MONTH_BUDGET.toLocaleString()} budget</span>
              </div>
            </div>
            <div className={`text-right ${overBudget ? "text-red-400" : "text-[#52d9a0]"}`}>
              <p className="text-xs uppercase tracking-widest mb-0.5">{overBudget ? "Over budget" : "Remaining"}</p>
              <p className="text-xl font-bold">{overBudget ? `+${fmt(spent - MONTH_BUDGET)}` : fmt(MONTH_BUDGET - spent)}</p>
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${budgetPct * 100}%`,
                background: overBudget
                  ? "linear-gradient(90deg,#ef4444,#f87171)"
                  : budgetPct > 0.8
                  ? "linear-gradient(90deg,#f59e6b,#fbbf24)"
                  : "linear-gradient(90deg,#c36dbb,#8f8fbf)",
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-[#444] text-xs">{activeTx.length} transactions this month</p>
            <button
              onClick={() => setShowPlaidModal(true)}
              className="text-[#555] hover:text-[#999] text-xs flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={10} /> Refresh
            </button>
          </div>
        </div>
      )}

      {/* ── Spending Wheel + Breakdown ─────────────────────────────── */}
      {bankConnected && pieData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Donut */}
          <div className="glass rounded-2xl p-6">
            <p className="text-[#999] text-xs uppercase tracking-widest mb-4">Spending by Category</p>
            <div className="relative">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={3} dataKey="value" labelLine={false} label={CustomLabel} stroke="none">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#101114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 12 }}
                    formatter={(v: unknown) => [`$${Number(v ?? 0).toFixed(2)}`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-white">{fmt(spent)}</span>
                <span className="text-[#666] text-xs">this month</span>
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="glass rounded-2xl p-6 flex flex-col">
            <p className="text-[#999] text-xs uppercase tracking-widest mb-4">Breakdown</p>
            <div className="space-y-2.5 flex-1">
              {pieData.map(({ name, value, color }) => {
                const pct = spent > 0 ? (value / spent) * 100 : 0;
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                        <span className="text-[#ccc] text-xs">{name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#555] text-xs">{pct.toFixed(0)}%</span>
                        <span className="text-white text-xs font-semibold w-16 text-right">${value.toFixed(0)}</span>
                      </div>
                    </div>
                    <div className="h-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Insight */}
            {byCategory.dining && (byCategory.dining / spent) > 0.20 && (
              <div className="mt-4 pt-4 border-t text-xs" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <span style={{ color: "#f59e6b" }}>💡 </span>
                <span className="text-[#888]">Dining is {((byCategory.dining / spent) * 100).toFixed(0)}% of spending. Consider using Amex Gold for 4x on every meal.</span>
              </div>
            )}
          </div>
        </div>
      ) : bankConnected ? (
        <div className="glass rounded-2xl p-8 text-center text-[#555] text-sm">No transactions to display.</div>
      ) : (
        /* Placeholder wheel when not connected */
        <div className="glass rounded-2xl p-8 text-center" style={{ border: "1px dashed rgba(255,255,255,0.06)" }}>
          <div className="w-32 h-32 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ border: "2px dashed rgba(255,255,255,0.08)" }}>
            <p className="text-[#444] text-xs text-center leading-relaxed">Connect bank<br />to see<br />spending wheel</p>
          </div>
          <p className="text-[#555] text-xs">Your spending breakdown will appear here once you connect your account.</p>
        </div>
      )}

      {/* ── Transaction Feed ───────────────────────────────────────── */}
      {bankConnected && activeTx.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-[#999] text-xs uppercase tracking-widest">Recent Transactions</p>
            <p className="text-[#666] text-xs">{activeTx.length} this month</p>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {displayTx.map((tx) => {
              const meta = CATEGORY_META[tx.category];
              return (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <span className="text-lg w-7 text-center shrink-0">{tx.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{tx.merchant}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${meta.color}18`, color: meta.color }}>
                        {meta.label}
                      </span>
                      <span className="text-[#555] text-xs">{relativeDay(tx.date)}</span>
                    </div>
                  </div>
                  <span className="text-white text-sm font-semibold shrink-0">−${tx.amount.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
          {activeTx.length > 6 && (
            <button
              onClick={() => setShowAllTx((v) => !v)}
              className="w-full py-3 text-xs text-[#666] hover:text-[#999] transition-colors text-center border-t"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              {showAllTx ? "Show less ↑" : `Show all ${activeTx.length} transactions ↓`}
            </button>
          )}
        </div>
      )}

      {/* ── Quick Action Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate("benefits")}
          className="glass rounded-2xl p-5 text-left glow-hover group transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(195,109,187,0.12)" }}>
              <Wallet size={17} style={{ color: "#c36dbb" }} />
            </div>
            <ChevronRight size={15} className="text-[#444] group-hover:text-[#c36dbb] transition-colors" />
          </div>
          <p className="text-2xl font-bold text-white mb-0.5">${totalUnused.toFixed(0)}</p>
          <p className="text-[#777] text-xs">Unused credits this period</p>
          {urgentCount > 0 && <p className="text-[#f59e6b] text-xs mt-2">{urgentCount} expiring soon</p>}
        </button>

        <button
          onClick={() => onNavigate("spend", { openROI: true })}
          className="glass rounded-2xl p-5 text-left glow-hover group transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(143,143,191,0.12)" }}>
              <Zap size={17} style={{ color: "#8f8fbf" }} />
            </div>
            <ChevronRight size={15} className="text-[#444] group-hover:text-[#8f8fbf] transition-colors" />
          </div>
          <p className="text-2xl font-bold text-white mb-0.5">{selectedCards.length}</p>
          <p className="text-[#777] text-xs">Cards in your wallet</p>
          <p className="text-[#8f8fbf] text-xs mt-2">View return on spend →</p>
        </button>

        <button
          onClick={() => onNavigate("wealth")}
          className="glass rounded-2xl p-5 text-left glow-hover group transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(82,217,160,0.1)" }}>
              <TrendingUp size={17} style={{ color: "#52d9a0" }} />
            </div>
            <ChevronRight size={15} className="text-[#444] group-hover:text-[#52d9a0] transition-colors" />
          </div>
          <p className="text-2xl font-bold text-white mb-0.5">Net Worth</p>
          <p className="text-[#777] text-xs">Track assets, debt & affordability</p>
          <p className="text-[#52d9a0] text-xs mt-2">10x rule checker →</p>
        </button>
      </div>

      {urgentCount > 0 && (
        <button
          onClick={() => onNavigate("benefits")}
          className="w-full glass rounded-2xl p-4 flex items-center gap-4 glow-hover group transition-all text-left"
          style={{ borderColor: "rgba(245,158,107,0.25)" }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,107,0.1)" }}>
            <AlertCircle size={17} style={{ color: "#f59e6b" }} />
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-semibold">{urgentCount} credit{urgentCount > 1 ? "s" : ""} expiring end of month</p>
            <p className="text-[#777] text-xs mt-0.5">${totalUnused.toFixed(0)} in value — mark them used before they reset</p>
          </div>
          <ChevronRight size={15} className="text-[#444] group-hover:text-[#f59e6b] transition-colors shrink-0" />
        </button>
      )}

      {/* Plaid modal */}
      {showPlaidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="glass rounded-2xl p-7 max-w-sm w-full" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(195,109,187,0.15)" }}>
                <Landmark size={18} style={{ color: "#c36dbb" }} />
              </div>
              <div>
                <p className="text-white font-bold">Connect your bank</p>
                <p className="text-[#666] text-xs">Secured by Plaid</p>
              </div>
            </div>
            <p className="text-[#888] text-sm mb-5 leading-relaxed">
              In production, this opens Plaid Link to securely connect your bank account with 256-bit encryption. Your credentials are never stored.
            </p>
            <div className="space-y-2">
              <button
                onClick={handleLoadDemo}
                className="w-full gradient-bg text-white font-semibold py-3 rounded-xl text-sm"
              >
                Load demo transactions
              </button>
              <button
                onClick={() => setShowPlaidModal(false)}
                className="w-full glass text-[#777] py-2.5 rounded-xl text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="text-[#444] text-xs text-center mt-4">
              Plaid integration · Bank-level security · Read-only access
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
