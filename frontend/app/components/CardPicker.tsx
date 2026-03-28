"use client";

import { useState } from "react";
import { Check, Star, Zap, Wallet, Plus, X } from "lucide-react";
import type { Card } from "../lib/types";

import { PLAID_DETECTED_CARD_IDS } from "./Dashboard";

interface Props {
  cards: Card[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  plaidConnected?: boolean;
}

function CardTile({ card, selected, onToggle, compact = false }: {
  card: Card;
  selected: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative rounded-2xl text-left transition-all w-full ${
        compact ? "p-4" : "p-5"
      } ${
        selected
          ? "border border-[rgba(195,109,187,0.5)]"
          : "glass hover:border-[rgba(255,255,255,0.12)]"
      }`}
      style={
        selected
          ? { background: "rgba(195,109,187,0.06)", boxShadow: "0 0 0 1px rgba(195,109,187,0.3), 0 8px 32px rgba(195,109,187,0.08)" }
          : {}
      }
    >
      {/* Action icon */}
      <div className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center ${selected ? "gradient-bg" : "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)]"}`}>
        {selected ? <X size={10} className="text-white" /> : <Plus size={10} className="text-[#666]" />}
      </div>

      {!selected && card.no_annual_fee && (
        <div className="absolute top-3 right-10">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(82,217,160,0.12)", color: "#52d9a0", border: "1px solid rgba(82,217,160,0.2)" }}>
            Free
          </span>
        </div>
      )}

      {/* Card art */}
      <div
        className={`w-full rounded-xl mb-3 flex items-center px-3 gap-2 ${compact ? "h-10" : "h-12"}`}
        style={{ background: `linear-gradient(135deg, ${card.color}cc, ${card.color}66)` }}
      >
        <div className="w-6 h-4 rounded-sm bg-white/20 border border-white/10" />
        <span className="text-white/70 text-[10px] font-medium ml-auto">{card.network}</span>
      </div>

      <p className={`text-white font-semibold leading-snug mb-1 ${compact ? "text-xs" : "text-sm"}`}>{card.name}</p>

      {card.no_annual_fee ? (
        <p className="text-[#52d9a0] text-xs font-medium">{compact ? "No fee" : "No annual fee"}</p>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-[#666] text-xs">${card.annual_fee}/yr</span>
          {!compact && card.total_annual_credits > 0 && (
            <span className="text-xs font-semibold" style={{ color: "#c36dbb" }}>
              ${card.total_annual_credits.toLocaleString()} credits
            </span>
          )}
          {!compact && card.total_annual_credits > card.annual_fee && (
            <Star size={11} style={{ color: "#f59e6b" }} fill="#f59e6b" />
          )}
        </div>
      )}
    </button>
  );
}

export default function CardPicker({ cards, selectedIds, onToggle, plaidConnected }: Props) {
  const [filter, setFilter] = useState<"all" | "premium" | "no_fee">("all");

  const selectedCards = cards.filter((c) => selectedIds.includes(c.id));
  const unselectedCards = cards.filter((c) => !selectedIds.includes(c.id));

  const premiumUnselected = unselectedCards.filter((c) => !c.no_annual_fee);
  const noFeeUnselected = unselectedCards.filter((c) => c.no_annual_fee);
  const browseCards = filter === "premium" ? premiumUnselected : filter === "no_fee" ? noFeeUnselected : unselectedCards;

  const plaidDetectedCards = plaidConnected
    ? cards.filter((c) => PLAID_DETECTED_CARD_IDS.includes(c.id))
    : [];

  return (
    <div className="space-y-8">
      {/* Plaid-detected banner */}
      {plaidConnected && plaidDetectedCards.length > 0 && (
        <div className="glass rounded-2xl p-4 flex items-start gap-3" style={{ borderColor: "rgba(82,217,160,0.2)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(82,217,160,0.12)" }}>
            <Zap size={15} style={{ color: "#52d9a0" }} />
          </div>
          <div>
            <p className="text-white text-sm font-semibold mb-0.5">Cards detected from your account</p>
            <p className="text-[#666] text-xs">
              {plaidDetectedCards.length} cards auto-added from your linked bank account.
            </p>
          </div>
        </div>
      )}

      {/* ── YOUR WALLET ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(195,109,187,0.12)" }}>
            <Wallet size={14} style={{ color: "#c36dbb" }} />
          </div>
          <h2 className="text-white font-semibold text-sm">Your Wallet</h2>
          {selectedCards.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(195,109,187,0.12)", color: "#c36dbb" }}>
              {selectedCards.length} card{selectedCards.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {selectedCards.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center" style={{ borderStyle: "dashed" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(255,255,255,0.04)" }}>
              <Wallet size={18} className="text-[#444]" />
            </div>
            <p className="text-[#666] text-sm">No cards in your wallet yet</p>
            <p className="text-[#444] text-xs mt-1">Add cards from the list below</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedCards.map((card) => (
              <CardTile key={card.id} card={card} selected onToggle={() => onToggle(card.id)} />
            ))}
          </div>
        )}
      </div>

      {/* ── DIVIDER ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        <span className="text-[#444] text-xs uppercase tracking-widest">Add Cards</span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>

      {/* ── BROWSE SECTION ── */}
      <div>
        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {(["all", "premium", "no_fee"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === f ? "gradient-bg text-white" : "glass text-[#999] hover:text-white"
              }`}
            >
              {f === "all" ? `All (${unselectedCards.length})` : f === "premium" ? `Premium (${premiumUnselected.length})` : `No Fee (${noFeeUnselected.length})`}
            </button>
          ))}
        </div>

        {browseCards.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <Check size={24} className="mx-auto mb-3 text-[#52d9a0]" />
            <p className="text-[#666] text-sm">You've added all {filter === "all" ? "" : filter === "premium" ? "premium " : "no-fee "}cards to your wallet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {browseCards.map((card) => (
              <CardTile key={card.id} card={card} selected={false} onToggle={() => onToggle(card.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
