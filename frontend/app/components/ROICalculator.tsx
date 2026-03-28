"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { fetchROI } from "../lib/api";
import type { ROIResult, SpendingProfile } from "../lib/types";

interface Props {
  selectedCardIds: string[];
  spending: SpendingProfile;
  onSpendingChange: (s: SpendingProfile) => void;
}

const CATEGORIES = [
  { key: "dining", label: "Dining" },
  { key: "groceries", label: "Groceries" },
  { key: "travel", label: "Travel" },
  { key: "gas", label: "Gas" },
  { key: "other", label: "Other" },
] as const;

export default function ROICalculator({ selectedCardIds, spending, onSpendingChange }: Props) {
  const [results, setResults] = useState<ROIResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculated, setCalculated] = useState(false);

  async function handleCalculate() {
    if (selectedCardIds.length === 0) return;
    setLoading(true);
    try {
      const data = await fetchROI(spending, selectedCardIds);
      setResults(data.results);
      setCalculated(true);
    } finally {
      setLoading(false);
    }
  }

  const best = results[0];

  return (
    <div className="space-y-5">
      {/* Spending inputs */}
      <div className="glass rounded-2xl p-6">
        <p className="text-[#999] text-xs uppercase tracking-widest mb-1">Monthly Spending</p>
        <p className="text-[#555] text-xs mb-5">We'll calculate net annual value after fees and credits</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CATEGORIES.map(({ key, label }) => (
            <div key={key}>
              <label className="text-[#777] text-xs block mb-1.5">{label}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-sm">$</span>
                <input
                  type="number"
                  value={spending[key as keyof SpendingProfile]}
                  onChange={(e) => onSpendingChange({ ...spending, [key]: Number(e.target.value) })}
                  className="w-full rounded-xl pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(195,109,187,0.4)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                />
              </div>
              <p className="text-[#444] text-xs mt-1">${((spending[key as keyof SpendingProfile] || 0) * 12).toLocaleString()}/yr</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={handleCalculate}
            disabled={loading || selectedCardIds.length === 0}
            className="gradient-bg text-white font-semibold px-6 py-2.5 rounded-xl transition-opacity text-sm disabled:opacity-40"
          >
            {loading ? "Calculating..." : "Calculate My ROI"}
          </button>
          {selectedCardIds.length === 0 && (
            <p className="text-[#555] text-xs">Add cards from My Cards first</p>
          )}
        </div>
      </div>

      {/* Results */}
      {calculated && results.length > 0 && (
        <>
          {/* Best card highlight */}
          {best && (
            <div
              className="rounded-2xl p-5"
              style={{
                background: "linear-gradient(135deg, rgba(195,109,187,0.08), rgba(143,143,191,0.08))",
                border: "1px solid rgba(195,109,187,0.2)",
              }}
            >
              <p className="text-[#999] text-xs uppercase tracking-widest mb-3">Best Performing Card</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-lg">{best.card_name}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-[#999]">
                    <span>${best.points_value.toFixed(0)} in rewards</span>
                    <span>+</span>
                    <span>${best.total_credits} credits</span>
                    <span>−</span>
                    <span>${best.annual_fee} fee</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#999] mb-0.5">Net Annual ROI</p>
                  <p className="text-3xl font-bold gradient-text">+${best.net_roi.toFixed(0)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="glass rounded-2xl p-6">
            <p className="text-[#999] text-xs uppercase tracking-widest mb-5">Net Annual ROI Comparison</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={results} barSize={36} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="card_name"
                  tick={{ fill: "#666", fontSize: 10 }}
                  tickFormatter={(v) => v.split(" ").slice(-2).join(" ")}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#555", fontSize: 10 }}
                  tickFormatter={(v) => `$${v}`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#101114",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "#fff",
                  }}
                  formatter={(v: unknown) => [`$${Number(v ?? 0).toFixed(0)}`, "Net ROI"]}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
                <Bar dataKey="net_roi" radius={[6, 6, 0, 0]}>
                  {results.map((r, i) => (
                    <Cell
                      key={i}
                      fill={r.net_roi >= 0 ? (i === 0 ? "#c36dbb" : "#8f8fbf") : "#3d3d55"}
                      fillOpacity={i === 0 ? 1 : 0.7}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Full breakdown */}
          <div className="space-y-3">
            {results.map((r, i) => (
              <div
                key={r.card_id}
                className="glass rounded-2xl p-5"
                style={i === 0 ? { borderColor: "rgba(195,109,187,0.2)" } : {}}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    {i === 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mr-2" style={{ background: "rgba(195,109,187,0.12)", color: "#c36dbb", border: "1px solid rgba(195,109,187,0.2)" }}>
                        Best ROI
                      </span>
                    )}
                    <p className="text-white font-semibold mt-1">{r.card_name}</p>
                    <p className="text-[#555] text-xs">{r.points_earned.toLocaleString()} points earned/yr</p>
                  </div>
                  <p className={`text-xl font-bold ${r.net_roi >= 0 ? "gradient-text" : "text-[#ef4444]"}`}>
                    {r.net_roi >= 0 ? "+" : ""}${r.net_roi.toFixed(0)}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-[#666] text-xs mb-1">Rewards Value</p>
                    <p className="text-white font-semibold text-sm">${r.points_value.toFixed(0)}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-[#666] text-xs mb-1">Credits</p>
                    <p className="text-white font-semibold text-sm">${r.total_credits}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-[#666] text-xs mb-1">Annual Fee</p>
                    <p className="text-[#ef4444] font-semibold text-sm">−${r.annual_fee}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
