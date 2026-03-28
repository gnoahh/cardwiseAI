"use client";

import { useState } from "react";
import { Clock, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, Zap, Info, X, Sparkles } from "lucide-react";
import type { Card, CardCredit } from "../lib/types";
import type { Transaction } from "../lib/transactions";
import { getTransactionsForCredit } from "../lib/creditMatcher";

interface Props {
  cards: Card[];
  getCreditUsed: (cardId: string, creditId: string) => number;
  onMarkUsed: (cardId: string, creditId: string, amount: number) => void;
  transactions?: Transaction[];
}

interface DetailModal {
  card: Card;
  credit: CardCredit;
}

export default function BenefitTracker({ cards, getCreditUsed, onMarkUsed, transactions = [] }: Props) {
  const [expanded, setExpanded] = useState<string[]>(cards.map((c) => c.id));
  const [modal, setModal] = useState<DetailModal | null>(null);

  const toggle = (id: string) =>
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const premiumCards = cards.filter((c) => !c.no_annual_fee && c.credits.length > 0);
  const noFeeCards = cards.filter((c) => c.no_annual_fee);

  const totalUnused = premiumCards.reduce(
    (acc, card) => acc + card.credits.reduce((s, cr) => s + Math.max(0, cr.amount - getCreditUsed(card.id, cr.id)), 0),
    0
  );
  const urgentCount = premiumCards.flatMap((card) =>
    card.credits.filter((c) => c.frequency === "monthly" && getCreditUsed(card.id, c.id) < c.amount)
  ).length;

  if (cards.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <p className="text-[#555] text-sm">Connect your bank or add cards to track benefits.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <p className="text-[#999] text-xs uppercase tracking-widest mb-2">Unused This Period</p>
          <p className="text-3xl font-bold text-white">${totalUnused.toFixed(0)}</p>
          {urgentCount > 0 && <p className="text-[#f59e6b] text-xs mt-1">{urgentCount} expire end of month</p>}
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-[#999] text-xs uppercase tracking-widest mb-2">Annual Credits Total</p>
          <p className="text-3xl font-bold gradient-text">
            ${premiumCards.reduce((a, c) => a + c.total_annual_credits, 0).toLocaleString()}
          </p>
          {transactions.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Zap size={11} style={{ color: "#52d9a0" }} />
              <p className="text-[#52d9a0] text-xs">Auto-tracked from {transactions.length} transactions</p>
            </div>
          )}
        </div>
      </div>

      {/* Premium cards */}
      {premiumCards.map((card) => {
        const isOpen = expanded.includes(card.id);
        const cardUnused = card.credits.reduce(
          (s, cr) => s + Math.max(0, cr.amount - getCreditUsed(card.id, cr.id)),
          0
        );
        const urgent = card.credits.filter(
          (c) => c.frequency === "monthly" && getCreditUsed(card.id, c.id) < c.amount
        );

        return (
          <div
            key={card.id}
            className="glass rounded-2xl overflow-hidden"
            style={urgent.length > 0 ? { borderColor: "rgba(245,158,107,0.25)" } : {}}
          >
            <button
              onClick={() => toggle(card.id)}
              className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${card.color}cc, ${card.color}55)` }}
                >
                  <div className="w-5 h-3 rounded-sm bg-white/20 border border-white/10" />
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold text-sm">{card.name}</p>
                  <p className="text-[#555] text-xs">${card.annual_fee}/yr · {card.credits.length} credits</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  {cardUnused > 0 ? (
                    <>
                      <p className="text-[#f59e6b] text-sm font-bold">${cardUnused.toFixed(0)}</p>
                      <p className="text-[#555] text-xs">unused</p>
                    </>
                  ) : (
                    <p className="text-[#52d9a0] text-xs font-semibold">All used ✓</p>
                  )}
                </div>
                {isOpen ? <ChevronUp size={15} className="text-[#555]" /> : <ChevronDown size={15} className="text-[#555]" />}
              </div>
            </button>

            {isOpen && (
              <div className="border-t px-5 py-4 space-y-5" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                {card.credits.map((credit) => {
                  const used = getCreditUsed(card.id, credit.id);
                  const remaining = Math.max(0, credit.amount - used);
                  const pct = Math.min(1, used / credit.amount);
                  const isFullyUsed = pct >= 1;
                  const isUrgent = credit.frequency === "monthly" && !isFullyUsed;
                  const autoTx = getTransactionsForCredit(transactions, card.id, credit.id);
                  const isAutoDetected = autoTx.length > 0;

                  return (
                    <div key={credit.id}>
                      <div className="flex items-start gap-3">
                        {/* Status icon */}
                        <div className="mt-0.5 shrink-0">
                          {isFullyUsed ? (
                            <CheckCircle2 size={15} className="text-[#444]" />
                          ) : isUrgent ? (
                            <Clock size={15} style={{ color: "#f59e6b" }} />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: "#c36dbb" }} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className={`text-sm font-semibold truncate ${isFullyUsed ? "text-[#555]" : "text-white"}`}>
                                {credit.name}
                              </p>
                              {isAutoDetected && (
                                <span
                                  className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                                  style={{ background: "rgba(82,217,160,0.1)", color: "#52d9a0", border: "1px solid rgba(82,217,160,0.2)" }}
                                >
                                  <Zap size={9} />
                                  Auto
                                </span>
                              )}
                            </div>
                            <div className="shrink-0 text-right">
                              <span className="text-white font-bold text-sm">${credit.amount}</span>
                              {!isFullyUsed && <span className="text-[#555] text-xs ml-1">/ ${remaining.toFixed(0)} left</span>}
                            </div>
                          </div>

                          <p className="text-[#555] text-xs mb-2">{credit.description}</p>

                          {/* Progress bar */}
                          <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct * 100}%`,
                                background: isFullyUsed
                                  ? "rgba(255,255,255,0.08)"
                                  : isUrgent
                                  ? "linear-gradient(90deg,#f59e6b,#fbbf24)"
                                  : "linear-gradient(90deg,#c36dbb,#8f8fbf)",
                              }}
                            />
                          </div>

                          {/* Auto-detected transactions */}
                          {isAutoDetected && (
                            <div className="mt-2 space-y-1">
                              {autoTx.slice(0, 3).map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between text-xs">
                                  <span className="text-[#555]">{tx.icon} {tx.merchant}</span>
                                  <span className="text-[#444]">−${tx.amount.toFixed(2)}</span>
                                </div>
                              ))}
                              {autoTx.length > 3 && (
                                <p className="text-[#444] text-xs">+{autoTx.length - 3} more transactions</p>
                              )}
                            </div>
                          )}

                          {isUrgent && (
                            <p className="text-[#f59e6b] text-xs mt-1">Resets end of month — don't let this expire</p>
                          )}

                          {/* Actions row */}
                          <div className="flex items-center gap-3 mt-2">
                            {/* Learn more / how to use */}
                            <button
                              onClick={() => setModal({ card, credit })}
                              className="flex items-center gap-1 text-xs text-[#666] hover:text-[#c36dbb] transition-colors"
                            >
                              <Info size={11} />
                              How to use
                            </button>

                            {/* Manual mark as used (for non-auto credits) */}
                            {!isFullyUsed && !isAutoDetected && (
                              <button
                                onClick={() => onMarkUsed(card.id, credit.id, credit.amount)}
                                className="text-xs text-[#555] hover:text-[#52d9a0] transition-colors"
                              >
                                Mark used →
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* No-fee cards */}
      {noFeeCards.length > 0 && (
        <div className="glass rounded-2xl p-5" style={{ borderColor: "rgba(82,217,160,0.12)" }}>
          <p className="text-[#999] text-xs uppercase tracking-widest mb-4">No Annual Fee Cards</p>
          <div className="space-y-3">
            {noFeeCards.map((card) => (
              <div key={card.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <div className="w-10 h-7 rounded-lg shrink-0" style={{ background: `linear-gradient(135deg, ${card.color}cc, ${card.color}55)` }} />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{card.name}</p>
                  <p className="text-[#555] text-xs">{card.cashback_highlight}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(82,217,160,0.08)", color: "#52d9a0" }}>
                  No Fee
                </span>
              </div>
            ))}
          </div>
          <p className="text-[#444] text-xs mt-4 flex items-center gap-1">
            <Sparkles size={11} style={{ color: "#8f8fbf" }} />
            Ask the AI Advisor which card to swipe for each purchase to maximize cashback.
          </p>
        </div>
      )}

      {/* ── Credit Detail Modal ──────────────────────────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
          onClick={() => setModal(null)}
        >
          <div
            className="glass rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            style={{ border: "1px solid rgba(255,255,255,0.12)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-7 rounded-lg"
                  style={{ background: `linear-gradient(135deg, ${modal.card.color}cc, ${modal.card.color}55)` }}
                />
                <div>
                  <p className="text-white font-bold">{modal.credit.name}</p>
                  <p className="text-[#666] text-xs">{modal.card.name}</p>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="text-[#555] hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Value */}
            <div
              className="rounded-xl p-4 mb-4 flex items-center justify-between"
              style={{ background: "linear-gradient(135deg, rgba(195,109,187,0.07), rgba(143,143,191,0.07))", border: "1px solid rgba(195,109,187,0.15)" }}
            >
              <div>
                <p className="text-[#999] text-xs">Credit value</p>
                <p className="text-2xl font-bold gradient-text">${modal.credit.amount}{modal.credit.frequency === "monthly" ? "/mo" : "/yr"}</p>
              </div>
              <div className="text-right">
                <p className="text-[#999] text-xs">Annual value</p>
                <p className="text-white font-bold">${modal.credit.annual_value}</p>
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <p className="text-[#999] text-xs uppercase tracking-widest mb-2">About This Credit</p>
              <p className="text-[#ccc] text-sm leading-relaxed">{modal.credit.description}</p>
            </div>

            {/* How to use */}
            {modal.credit.how_to_use && (
              <div className="mb-4">
                <p className="text-[#999] text-xs uppercase tracking-widest mb-2">How to Use It</p>
                <p className="text-[#aaa] text-sm leading-relaxed">{modal.credit.how_to_use}</p>
              </div>
            )}

            {/* Eligible merchants */}
            {modal.credit.merchants && modal.credit.merchants.length > 0 && (
              <div className="mb-4">
                <p className="text-[#999] text-xs uppercase tracking-widest mb-2">Eligible Merchants</p>
                <div className="flex flex-wrap gap-1.5">
                  {modal.credit.merchants.map((m) => (
                    <span key={m} className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "#ccc" }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Pro tip */}
            {modal.credit.tip && (
              <div
                className="rounded-xl p-3.5 mb-4 flex items-start gap-2.5"
                style={{ background: "rgba(143,143,191,0.08)", border: "1px solid rgba(143,143,191,0.15)" }}
              >
                <span className="text-base shrink-0">💡</span>
                <p className="text-[#aaa] text-xs leading-relaxed">{modal.credit.tip}</p>
              </div>
            )}

            {/* Auto-detection status */}
            {modal.credit.auto_detected !== undefined && (
              <div className="mb-4 flex items-center gap-2 text-xs">
                {modal.credit.auto_detected ? (
                  <>
                    <Zap size={12} style={{ color: "#52d9a0" }} />
                    <span className="text-[#52d9a0]">Auto-tracked — we detect eligible transactions automatically</span>
                  </>
                ) : (
                  <>
                    <Info size={12} className="text-[#666]" />
                    <span className="text-[#666]">Requires manual tracking — credit can't be auto-detected from transactions</span>
                  </>
                )}
              </div>
            )}

            {/* CTA link */}
            {modal.credit.link && (
              <a
                href={modal.credit.link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full gradient-bg text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
              >
                {modal.credit.link_label ?? "Learn more"}
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
