"use client";

import { useState, useEffect, useMemo } from "react";
import { LayoutDashboard, CreditCard, Shield, Zap, Sparkles, TrendingUp } from "lucide-react";
import { fetchCards } from "./lib/api";
import { useUserData } from "./lib/store";
import Dashboard from "./components/Dashboard";
import CardPicker from "./components/CardPicker";
import BenefitTracker from "./components/BenefitTracker";
import SpendGuide from "./components/SpendGuide";
import WealthTracker from "./components/WealthTracker";
import AIChat from "./components/AIChat";
import LiveAdvisor from "./components/LiveAdvisor";
import { totalSpend, type Transaction } from "./lib/transactions";
import { matchCreditsFromTransactions } from "./lib/creditMatcher";
import { initWealthStorage } from "./lib/wealth";
import type { Card } from "./lib/types";

type Tab = "dashboard" | "cards" | "benefits" | "spend" | "wealth" | "chat";

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Overview",    icon: <LayoutDashboard size={15} /> },
  { id: "cards",     label: "My Cards",    icon: <CreditCard size={15} /> },
  { id: "benefits",  label: "Benefits",    icon: <Shield size={15} /> },
  { id: "spend",     label: "Spend Guide", icon: <Zap size={15} /> },
  { id: "wealth",    label: "Wealth",      icon: <TrendingUp size={15} /> },
  { id: "chat",      label: "AI Advisor",  icon: <Sparkles size={15} /> },
];

const SUBTITLES: Partial<Record<Tab, string>> = {
  dashboard: "Your financial picture at a glance",
  cards:     "Your cards — connected via Plaid or added manually",
  benefits:  "Credits auto-tracked from your transactions",
  spend:     "Look up any retailer and see which card to swipe",
  wealth:    "Net worth, affordability & financial health",
  chat:      "Ask anything about your cards and benefits",
};

export default function Home() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [autoOpenROI, setAutoOpenROI] = useState(false);
  const [allCards, setAllCards] = useState<Card[]>([]);

  // Transactions from Plaid/demo
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const {
    selectedCardIds, spending, toggleCard, markCreditUsed,
    updateSpending, getCreditUsed, setSelectedCardIds,
  } = useUserData();

  useEffect(() => {
    fetchCards().then(setAllCards).catch(() => {});
    initWealthStorage(); // seed localStorage so AI Advisor always has financial context
  }, []);

  const selectedCards = allCards.filter((c) => selectedCardIds.includes(c.id));

  // Auto-match transactions → credit usage (computed, not stored)
  const autoMatchedCredits = useMemo(
    () => matchCreditsFromTransactions(transactions, selectedCardIds),
    [transactions, selectedCardIds]
  );

  // Merge: auto-matched takes precedence over manual markings
  function getEffectiveCreditUsed(cardId: string, creditId: string): number {
    const autoKey = `${cardId}::${creditId}`;
    const autoAmount = autoMatchedCredits[autoKey];
    if (autoAmount !== undefined) return autoAmount;
    return getCreditUsed(cardId, creditId); // fall back to manual
  }

  function handleMarkUsed(cardId: string, creditId: string, amount: number) {
    // Only allow manual marking if not auto-detected
    const autoKey = `${cardId}::${creditId}`;
    if (autoMatchedCredits[autoKey] === undefined) {
      markCreditUsed(cardId, creditId, amount);
    }
  }

  function handleTransactionsLoaded(txs: Transaction[]) {
    setTransactions(txs);
  }

  function handlePlaidCardsDetected(cardIds: string[]) {
    // Auto-select Plaid-detected cards, keeping any manually added ones
    const merged = Array.from(new Set([...selectedCardIds, ...cardIds]));
    setSelectedCardIds(merged);
  }

  const monthlySpend = transactions.length > 0 ? totalSpend(transactions) : Object.values(spending).reduce((a, b) => a + b, 0);

  function navigateTo(t: Tab, opts?: { openROI?: boolean }) {
    setTab(t);
    setAutoOpenROI(!!opts?.openROI);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-base)" }}>
      {/* Top bar */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-[60px]"
        style={{
          background: "rgba(8,9,11,0.8)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #c36dbb, #8f8fbf)" }}>
            <CreditCard size={14} className="text-white" />
          </div>
          <span className="font-bold text-white tracking-tight">CardWise</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "rgba(195,109,187,0.12)", color: "#c36dbb", border: "1px solid rgba(195,109,187,0.2)" }}>
            AI
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => navigateTo(n.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === n.id ? "text-white" : "text-[#555] hover:text-[#888]"}`}
              style={tab === n.id ? { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" } : {}}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="text-[#333] text-xs hidden sm:block">Powered by Gemini</span>
          {selectedCards.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#52d9a0]" />
              <span className="text-[#777]">{selectedCards.length} card{selectedCards.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{ background: "rgba(8,9,11,0.95)", borderTop: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(40px)" }}
      >
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => navigateTo(n.id)}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-[9px] transition-colors"
            style={tab === n.id ? { color: "#c36dbb" } : { color: "#444" }}
          >
            {n.icon}
            {n.label}
          </button>
        ))}
      </nav>

      <main className="pt-[60px] pb-20 md:pb-8 flex-1">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white">{NAV.find((n) => n.id === tab)?.label}</h1>
            <p className="text-[#555] text-xs mt-0.5">{SUBTITLES[tab]}</p>
          </div>

          {tab === "dashboard" && (
            <Dashboard
              selectedCards={selectedCards}
              getCreditUsed={getEffectiveCreditUsed}
              onNavigate={(t, opts) => navigateTo(t as Tab, opts)}
              onTransactionsLoaded={handleTransactionsLoaded}
              onPlaidCardsDetected={handlePlaidCardsDetected}
            />
          )}

          {tab === "cards" && (
            allCards.length === 0 ? (
              <div className="glass rounded-2xl p-16 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(195,109,187,0.1)" }}>
                  <CreditCard size={22} style={{ color: "#c36dbb" }} />
                </div>
                <p className="text-[#777] text-sm">Backend not connected</p>
                <p className="text-[#444] text-xs mt-1">Start the FastAPI server on port 8000</p>
              </div>
            ) : (
              <CardPicker
                cards={allCards}
                selectedIds={selectedCardIds}
                onToggle={toggleCard}
                plaidConnected={transactions.length > 0}
              />
            )
          )}

          {tab === "benefits" && (
            <BenefitTracker
              cards={selectedCards}
              getCreditUsed={getEffectiveCreditUsed}
              onMarkUsed={handleMarkUsed}
              transactions={transactions}
            />
          )}

          {tab === "spend" && (
            <SpendGuide
              selectedCards={selectedCards}
              selectedCardIds={selectedCardIds}
              spending={spending}
              onSpendingChange={updateSpending}
              autoOpenROI={autoOpenROI}
            />
          )}

          {tab === "wealth" && (
            <WealthTracker monthlySpend={monthlySpend} transactions={transactions} />
          )}

          {tab === "chat" && <LiveAdvisor selectedCardIds={selectedCardIds} />}
        </div>
      </main>
    </div>
  );
}
