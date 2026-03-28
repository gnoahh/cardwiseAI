/**
 * Automatic credit matching engine.
 * Scans transactions and maps them to eligible card credits,
 * so users never have to manually track what they've used.
 */

import type { Transaction } from "./transactions";

export interface CreditRule {
  creditId: string;
  /** lowercase merchant substrings that trigger this credit */
  merchantKeywords: string[];
  /** transaction categories that trigger this credit */
  categories?: string[];
  /** monthly cap in dollars */
  monthlyCap?: number;
  /** annual cap in dollars */
  annualCap?: number;
  /** whether this credit requires manual confirmation (e.g. airline fee) */
  manualOnly?: boolean;
}

// ── Per-card credit matching rules ─────────────────────────────────────────
export const CREDIT_RULES: Record<string, CreditRule[]> = {
  amex_gold: [
    {
      creditId: "dining_credit",
      merchantKeywords: ["grubhub", "seamless", "cheesecake factory", "goldbelly", "wine.com", "five guys"],
      monthlyCap: 10,
    },
    {
      creditId: "uber_cash",
      merchantKeywords: ["uber eats", "uber"],
      monthlyCap: 10,
    },
    {
      creditId: "hotel_collection",
      merchantKeywords: [],
      manualOnly: true, // requires 2-night stay at eligible property
    },
    {
      creditId: "resy_credit",
      merchantKeywords: ["resy"],
      monthlyCap: 50, // $50 per half-year, treat as 50 cap
    },
  ],
  amex_platinum: [
    {
      creditId: "airline_fee",
      merchantKeywords: [],
      manualOnly: true, // requires pre-selecting an airline
      annualCap: 200,
    },
    {
      creditId: "hotel_credit",
      merchantKeywords: [],
      manualOnly: true, // FHR/Hotel Collection booking
      annualCap: 200,
    },
    {
      creditId: "uber_cash_platinum",
      merchantKeywords: ["uber eats", "uber"],
      monthlyCap: 15,
    },
    {
      creditId: "digital_entertainment",
      merchantKeywords: ["disney+", "disney plus", "hulu", "espn+", "peacock", "nyt", "new york times", "the atlantic", "siriusxm", "audible"],
      monthlyCap: 20,
    },
    {
      creditId: "walmart_plus",
      merchantKeywords: ["walmart+", "walmart plus"],
      monthlyCap: 12.95,
    },
    {
      creditId: "saks",
      merchantKeywords: ["saks fifth avenue", "saks.com", "saks"],
      annualCap: 100, // $50 Jan-Jun, $50 Jul-Dec
    },
  ],
  chase_sapphire_reserve: [
    {
      creditId: "travel_credit",
      merchantKeywords: ["delta", "united", "american airlines", "southwest", "jetblue", "marriott", "hilton", "hyatt", "airbnb", "uber", "lyft"],
      categories: ["travel"],
      annualCap: 300,
    },
    {
      creditId: "doordash_csr",
      merchantKeywords: ["doordash", "dashpass"],
      monthlyCap: 5,
    },
  ],
  chase_sapphire_preferred: [
    {
      creditId: "hotel_credit_csp",
      merchantKeywords: [],
      manualOnly: true,
      annualCap: 50,
    },
  ],
  venture_x: [
    {
      creditId: "travel_credit_vx",
      merchantKeywords: [],
      manualOnly: true, // Capital One Travel portal only
      annualCap: 300,
    },
  ],
};

// ── Match result ─────────────────────────────────────────────────────────────
export interface CreditMatch {
  cardId: string;
  creditId: string;
  matchedAmount: number;
  matchedTransactions: Transaction[];
  autoDetected: boolean;
}

/**
 * Given a list of transactions and the user's selected cards,
 * compute how much of each credit has been consumed this period.
 * Returns a map: `${cardId}::${creditId}` → used amount
 */
export function matchCreditsFromTransactions(
  transactions: Transaction[],
  selectedCardIds: string[]
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const cardId of selectedCardIds) {
    const rules = CREDIT_RULES[cardId];
    if (!rules) continue;

    for (const rule of rules) {
      if (rule.manualOnly) continue;

      const key = `${cardId}::${rule.creditId}`;
      const cap = rule.monthlyCap ?? rule.annualCap ?? Infinity;
      let used = 0;

      for (const tx of transactions) {
        if (used >= cap) break;

        const merchantLower = tx.merchant.toLowerCase();
        const categoryMatch = rule.categories?.includes(tx.category) ?? false;
        const merchantMatch = rule.merchantKeywords.some((kw) => merchantLower.includes(kw));

        if (merchantMatch || categoryMatch) {
          const contribution = Math.min(tx.amount, cap - used);
          used += contribution;
        }
      }

      if (used > 0) {
        result[key] = Math.min(used, cap);
      }
    }
  }

  return result;
}

/** Returns the list of transactions that triggered a specific credit */
export function getTransactionsForCredit(
  transactions: Transaction[],
  cardId: string,
  creditId: string
): Transaction[] {
  const rules = CREDIT_RULES[cardId];
  if (!rules) return [];
  const rule = rules.find((r) => r.creditId === creditId);
  if (!rule || rule.manualOnly) return [];

  return transactions.filter((tx) => {
    const merchantLower = tx.merchant.toLowerCase();
    const categoryMatch = rule.categories?.includes(tx.category) ?? false;
    const merchantMatch = rule.merchantKeywords.some((kw) => merchantLower.includes(kw));
    return merchantMatch || categoryMatch;
  });
}

/** Detects interest charges in a transaction list — used for financial health warnings */
export function detectInterestCharges(transactions: Transaction[]): { amount: number; transactions: Transaction[] } {
  const interestTx = transactions.filter((tx) => {
    const m = tx.merchant.toLowerCase();
    return (
      m.includes("interest charge") ||
      m.includes("finance charge") ||
      m.includes("interest fee") ||
      m.includes("purchase interest") ||
      m.includes("cash advance fee")
    );
  });
  const amount = interestTx.reduce((s, t) => s + t.amount, 0);
  return { amount, transactions: interestTx };
}

/** Detects annual fees charged by credit cards in transactions */
export function detectAnnualFees(transactions: Transaction[]): Transaction[] {
  return transactions.filter((tx) => {
    const m = tx.merchant.toLowerCase();
    return m.includes("annual fee") || m.includes("membership fee");
  });
}
