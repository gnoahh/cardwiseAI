"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, Shield, AlertCircle } from "lucide-react";
import {
  DEFAULT_WEALTH,
  netWorth,
  liquidAssets,
  totalAssets,
  totalLiabilities,
  affordabilityCheck,
  getInsights,
  type WealthProfile,
  type AssetEntry,
  type LiabilityEntry,
} from "../lib/wealth";
import { detectInterestCharges } from "../lib/creditMatcher";
import type { Transaction } from "../lib/transactions";

function fmt(n: number, signed = false) {
  const abs = Math.abs(n);
  const str = abs >= 1000000
    ? `$${(abs / 1000000).toFixed(2)}M`
    : abs >= 1000
    ? `$${(abs / 1000).toFixed(1)}k`
    : `$${abs.toFixed(0)}`;
  return signed && n > 0 ? `+${str}` : n < 0 ? `-${str.slice(1)}` : str;
}

const ASSET_LABELS = ["Checking Account", "Savings Account", "Stock Portfolio", "401(k)", "Roth IRA", "Crypto", "Real Estate", "Other"];
const LIABILITY_LABELS = ["Credit Card Balance", "Student Loans", "Auto Loan", "Mortgage", "Personal Loan", "Medical Debt", "Other"];

const WEALTH_KEY = "cardwise_wealth";

const EMPTY_WEALTH: WealthProfile = { monthlyIncome: 0, assets: [], liabilities: [] };

export default function WealthTracker({ monthlySpend, transactions = [] }: { monthlySpend: number; transactions?: Transaction[] }) {
  const [wealth, setWealth] = useState<WealthProfile>(EMPTY_WEALTH);
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const userModified = useRef(false);

  // Load from localStorage on mount (only if user previously saved data)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WEALTH_KEY);
      if (stored) setWealth(JSON.parse(stored));
    } catch {}
  }, []);

  // Save to localStorage only after the user has made a change (not on initial mount)
  useEffect(() => {
    if (!userModified.current) return;
    try { localStorage.setItem(WEALTH_KEY, JSON.stringify(wealth)); } catch {}
  }, [wealth]);

  function applyWealth(w: WealthProfile) {
    userModified.current = true;
    setWealth(w);
  }

  function loadDemoData() {
    userModified.current = true;
    setWealth(DEFAULT_WEALTH);
    localStorage.setItem(WEALTH_KEY, JSON.stringify(DEFAULT_WEALTH));
  }

  function clearData() {
    userModified.current = true;
    setWealth(EMPTY_WEALTH);
    localStorage.removeItem(WEALTH_KEY);
  }
  const [activeSection, setActiveSection] = useState<"overview" | "assets" | "liabilities" | "check">("overview");

  const nw = netWorth(wealth);
  const liquid = liquidAssets(wealth);
  const assets = totalAssets(wealth);
  const liabilities = totalLiabilities(wealth);
  const insights = getInsights(wealth, monthlySpend);

  const affordability = purchaseAmount && Number(purchaseAmount) > 0
    ? affordabilityCheck(Number(purchaseAmount), liquid, wealth.monthlyIncome)
    : null;

  function updateAsset(id: string, field: keyof AssetEntry, value: string | number) {
    userModified.current = true;
    setWealth((w) => ({
      ...w,
      assets: w.assets.map((a) => a.id === id ? { ...a, [field]: value } : a),
    }));
  }

  function updateLiability(id: string, field: keyof LiabilityEntry, value: string | number) {
    userModified.current = true;
    setWealth((w) => ({
      ...w,
      liabilities: w.liabilities.map((l) => l.id === id ? { ...l, [field]: value } : l),
    }));
  }

  function addAsset() {
    userModified.current = true;
    setWealth((w) => ({
      ...w,
      assets: [...w.assets, { id: `a${Date.now()}`, label: "New Asset", amount: 0, type: "liquid" }],
    }));
  }

  function addLiability() {
    userModified.current = true;
    setWealth((w) => ({
      ...w,
      liabilities: [...w.liabilities, { id: `l${Date.now()}`, label: "New Debt", amount: 0, rate: 0 }],
    }));
  }

  function removeAsset(id: string) {
    userModified.current = true;
    setWealth((w) => ({ ...w, assets: w.assets.filter((a) => a.id !== id) }));
  }

  function removeLiability(id: string) {
    userModified.current = true;
    setWealth((w) => ({ ...w, liabilities: w.liabilities.filter((l) => l.id !== id) }));
  }

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "assets", label: "Assets" },
    { id: "liabilities", label: "Debts" },
    { id: "check", label: "10x Rule" },
  ] as const;

  return (
    <div className="space-y-5">

      {/* Demo / Clear controls */}
      <div className="flex items-center justify-between">
        <p className="text-[#555] text-xs">Enter your financial data or load a sample profile.</p>
        <div className="flex gap-2">
          <button onClick={clearData}
            className="text-xs px-3 py-1.5 rounded-xl glass transition-colors"
            style={{ color: "#555" }}>
            Clear
          </button>
          <button onClick={loadDemoData}
            className="text-xs px-3 py-1.5 rounded-xl transition-all gradient-bg text-white">
            Load Demo Data
          </button>
        </div>
      </div>

      {/* Net Worth Hero */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "linear-gradient(135deg, rgba(195,109,187,0.07), rgba(143,143,191,0.07))", border: "1px solid rgba(195,109,187,0.15)" }}
      >
        <p className="text-[#999] text-xs uppercase tracking-widest mb-2">Net Worth</p>
        <p className={`text-4xl font-bold mb-3 ${nw >= 0 ? "gradient-text" : "text-red-400"}`}>{fmt(nw)}</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[#666] text-xs mb-1">Total Assets</p>
            <p className="text-[#52d9a0] font-bold">{fmt(assets)}</p>
          </div>
          <div>
            <p className="text-[#666] text-xs mb-1">Total Debts</p>
            <p className="text-red-400 font-bold">{fmt(liabilities)}</p>
          </div>
          <div>
            <p className="text-[#666] text-xs mb-1">Liquid Cash</p>
            <p className="text-white font-bold">{fmt(liquid)}</p>
          </div>
        </div>

        {/* Asset vs Liability bar */}
        <div className="mt-4 h-2 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-l-full"
            style={{ width: `${(assets / (assets + liabilities)) * 100}%`, background: "linear-gradient(90deg, #52d9a0, #34d399)" }}
          />
          <div
            className="h-full rounded-r-full flex-1"
            style={{ background: "rgba(239,68,68,0.4)" }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[#52d9a0]">Assets {((assets / (assets + liabilities)) * 100).toFixed(0)}%</span>
          <span className="text-[10px] text-red-400">Debts {((liabilities / (assets + liabilities)) * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSection(t.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeSection === t.id ? "gradient-bg text-white" : "glass text-[#777] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeSection === "overview" && (
        <div className="space-y-4">
          {/* Income */}
          <div className="glass rounded-2xl p-5">
            <p className="text-[#999] text-xs uppercase tracking-widest mb-3">Monthly Income</p>
            <div className="flex items-center gap-3">
              <span className="text-[#666] text-sm">$</span>
              <input
                type="number"
                value={wealth.monthlyIncome}
                onChange={(e) => { userModified.current = true; setWealth((w) => ({ ...w, monthlyIncome: Number(e.target.value) })); }}
                className="flex-1 bg-transparent text-white text-2xl font-bold focus:outline-none"
              />
              <span className="text-[#666] text-sm">/month</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-[#666] text-xs mb-1">Monthly spend</p>
                <p className="text-white font-semibold">${monthlySpend > 0 ? monthlySpend.toFixed(0) : "—"}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-[#666] text-xs mb-1">Savings rate</p>
                <p className={`font-semibold ${((wealth.monthlyIncome - monthlySpend) / wealth.monthlyIncome) * 100 >= 20 ? "text-[#52d9a0]" : "text-[#f59e6b]"}`}>
                  {monthlySpend > 0 ? `${Math.max(0, ((wealth.monthlyIncome - monthlySpend) / wealth.monthlyIncome) * 100).toFixed(0)}%` : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Financial insights */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[#999] text-xs uppercase tracking-widest">Financial Health Check</p>
              {transactions.length > 0 && (
                <span className="text-[10px] text-[#52d9a0] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#52d9a0] inline-block" />
                  From your transactions
                </span>
              )}
            </div>

            {/* Interest charge alert — highest priority */}
            {(() => {
              const { amount, transactions: interestTx } = detectInterestCharges(transactions);
              if (amount > 0) return (
                <div
                  className="rounded-xl p-4 mb-4 border"
                  style={{ background: "rgba(239,68,68,0.07)", borderColor: "rgba(239,68,68,0.25)" }}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg shrink-0">🚨</span>
                    <div>
                      <p className="text-red-400 font-semibold text-sm mb-1">
                        You were charged ${amount.toFixed(2)} in credit card interest this month
                      </p>
                      <p className="text-[#aaa] text-xs leading-relaxed">
                        At typical APRs of 20–29%, carrying a balance is costing you significantly. <span className="text-white font-semibold">Pay down your credit card balance immediately</span> — the guaranteed 20%+ "return" beats any investment. Do not spend on non-essentials or invest in the stock market while paying this rate.
                      </p>
                      {interestTx.length > 0 && (
                        <p className="text-[#666] text-xs mt-2">
                          Detected from: {interestTx.map(t => t.merchant).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
              return null;
            })()}

            <div className="space-y-3">
              {insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-[#aaa] leading-relaxed">
                  <span className="text-base shrink-0">{insight.startsWith("✅") ? "✅" : insight.startsWith("⚠️") ? "⚠️" : "💡"}</span>
                  <span>{insight.replace(/^(✅|⚠️|💡)\s/, "")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assets */}
      {activeSection === "assets" && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div>
              <p className="text-[#999] text-xs uppercase tracking-widest">Assets</p>
              <p className="text-[#52d9a0] font-bold mt-0.5">{fmt(assets)} total</p>
            </div>
            <button onClick={addAsset} className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-lg text-xs text-[#999] hover:text-white transition-colors">
              <Plus size={12} /> Add
            </button>
          </div>

          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {wealth.assets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-3 px-5 py-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: asset.type === "liquid" ? "rgba(82,217,160,0.12)" : asset.type === "investment" ? "rgba(195,109,187,0.12)" : "rgba(143,143,191,0.12)" }}
                >
                  {asset.type === "liquid" ? <Shield size={13} style={{ color: "#52d9a0" }} /> :
                   asset.type === "investment" ? <TrendingUp size={13} style={{ color: "#c36dbb" }} /> :
                   <TrendingUp size={13} style={{ color: "#8f8fbf" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <select
                    value={asset.label}
                    onChange={(e) => updateAsset(asset.id, "label", e.target.value)}
                    className="bg-transparent text-white text-sm focus:outline-none w-full"
                    style={{ appearance: "none" }}
                  >
                    {ASSET_LABELS.map((l) => <option key={l} value={l} style={{ background: "#101114" }}>{l}</option>)}
                  </select>
                  <select
                    value={asset.type}
                    onChange={(e) => updateAsset(asset.id, "type", e.target.value)}
                    className="bg-transparent text-[#555] text-xs focus:outline-none"
                    style={{ appearance: "none" }}
                  >
                    <option value="liquid" style={{ background: "#101114" }}>Liquid</option>
                    <option value="investment" style={{ background: "#101114" }}>Investment</option>
                    <option value="property" style={{ background: "#101114" }}>Property</option>
                  </select>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[#555]">$</span>
                  <input
                    type="number"
                    value={asset.amount}
                    onChange={(e) => updateAsset(asset.id, "amount", Number(e.target.value))}
                    className="w-24 bg-transparent text-white text-sm font-semibold text-right focus:outline-none"
                  />
                </div>
                <button onClick={() => removeAsset(asset.id)} className="text-[#444] hover:text-red-400 transition-colors ml-1">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liabilities */}
      {activeSection === "liabilities" && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div>
              <p className="text-[#999] text-xs uppercase tracking-widest">Debts & Liabilities</p>
              <p className="text-red-400 font-bold mt-0.5">{fmt(liabilities)} total</p>
            </div>
            <button onClick={addLiability} className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-lg text-xs text-[#999] hover:text-white transition-colors">
              <Plus size={12} /> Add
            </button>
          </div>

          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {wealth.liabilities.map((lib) => (
              <div key={lib.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.1)" }}>
                  <TrendingDown size={13} className="text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <select
                    value={lib.label}
                    onChange={(e) => updateLiability(lib.id, "label", e.target.value)}
                    className="bg-transparent text-white text-sm focus:outline-none w-full"
                    style={{ appearance: "none" }}
                  >
                    {LIABILITY_LABELS.map((l) => <option key={l} value={l} style={{ background: "#101114" }}>{l}</option>)}
                  </select>
                  {lib.rate !== undefined && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={lib.rate}
                        onChange={(e) => updateLiability(lib.id, "rate", Number(e.target.value))}
                        className="w-10 bg-transparent text-[#555] text-xs focus:outline-none"
                      />
                      <span className="text-[#555] text-xs">% APR</span>
                      {(lib.rate || 0) > 15 && <span className="text-[10px] text-red-400 ml-1">High interest</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[#555]">$</span>
                  <input
                    type="number"
                    value={lib.amount}
                    onChange={(e) => updateLiability(lib.id, "amount", Number(e.target.value))}
                    className="w-24 bg-transparent text-red-400 text-sm font-semibold text-right focus:outline-none"
                  />
                </div>
                <button onClick={() => removeLiability(lib.id)} className="text-[#444] hover:text-red-400 transition-colors ml-1">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10x Rule */}
      {activeSection === "check" && (
        <div className="space-y-4">
          {/* Education card */}
          <div className="glass rounded-2xl p-5" style={{ borderColor: "rgba(143,143,191,0.2)" }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(143,143,191,0.12)" }}>
                <AlertCircle size={16} style={{ color: "#8f8fbf" }} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm mb-1">The 10x Rule</p>
                <p className="text-[#888] text-xs leading-relaxed">
                  Before making a purchase, check if your <span className="text-white">liquid savings</span> are at least <span className="text-white">10× the purchase price</span>. If you can't buy it ten times over in cash, you can't truly afford it. This rule prevents lifestyle inflation and financial stress.
                </p>
              </div>
            </div>
          </div>

          {/* Calculator */}
          <div className="glass rounded-2xl p-6">
            <p className="text-[#999] text-xs uppercase tracking-widest mb-4">Affordability Check</p>

            <div className="relative mb-5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555] text-xl font-light">$</span>
              <input
                type="number"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                placeholder="Enter purchase amount"
                className="w-full rounded-2xl pl-10 pr-4 py-4 text-white text-2xl font-bold placeholder-[#333] focus:outline-none transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(195,109,187,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
              />
            </div>

            {affordability && (
              <div className="space-y-4">
                {/* Verdict */}
                <div
                  className="rounded-2xl p-5"
                  style={{ background: `${affordability.color}0d`, border: `1px solid ${affordability.color}30` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: affordability.color }} />
                    <span className="font-bold text-white capitalize">{affordability.verdict === "comfortable" ? "✅ Good to go" : affordability.verdict === "caution" ? "⚠️ Proceed with caution" : "❌ Not recommended"}</span>
                  </div>
                  <p className="text-[#aaa] text-sm leading-relaxed">{affordability.message}</p>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-[#666] text-xs mb-1">Purchase</p>
                    <p className="text-white font-bold">${Number(purchaseAmount).toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-[#666] text-xs mb-1">10× Required</p>
                    <p className="font-bold" style={{ color: affordability.color }}>${affordability.tenX.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-[#666] text-xs mb-1">Your Liquid</p>
                    <p className={`font-bold ${liquid >= affordability.tenX ? "text-[#52d9a0]" : "text-[#f59e6b]"}`}>${liquid.toLocaleString()}</p>
                  </div>
                </div>

                {/* Progress toward 10x */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[#666] text-xs">Progress toward 10× threshold</span>
                    <span className="text-xs font-semibold" style={{ color: affordability.color }}>
                      {((liquid / affordability.tenX) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (liquid / affordability.tenX) * 100)}%`, background: affordability.color }}
                    />
                  </div>
                </div>
              </div>
            )}

            {!purchaseAmount && (
              <div className="space-y-2">
                <p className="text-[#555] text-xs mb-3">Quick examples:</p>
                {[199, 999, 2499, 9999, 49999].map((amt) => {
                  const check = affordabilityCheck(amt, liquid, wealth.monthlyIncome);
                  return (
                    <button
                      key={amt}
                      onClick={() => setPurchaseAmount(String(amt))}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-colors glow-hover"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <span className="text-[#aaa]">${amt.toLocaleString()}</span>
                      <span className="text-xs font-medium" style={{ color: check.color }}>
                        {check.verdict === "comfortable" ? "✅ Comfortable" : check.verdict === "caution" ? "⚠️ Caution" : "❌ Wait"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
