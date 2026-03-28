export interface AssetEntry {
  id: string;
  label: string;
  amount: number;
  type: "liquid" | "investment" | "property";
}

export interface LiabilityEntry {
  id: string;
  label: string;
  amount: number;
  rate?: number; // APR %
}

export interface WealthProfile {
  assets: AssetEntry[];
  liabilities: LiabilityEntry[];
  monthlyIncome: number;
}

export const DEFAULT_WEALTH: WealthProfile = {
  monthlyIncome: 7500,
  assets: [
    { id: "a1", label: "Checking Account", amount: 8500,   type: "liquid" },
    { id: "a2", label: "Savings Account",  amount: 22000,  type: "liquid" },
    { id: "a3", label: "Stock Portfolio",  amount: 31000,  type: "investment" },
    { id: "a4", label: "401(k)",           amount: 48000,  type: "investment" },
  ],
  liabilities: [
    { id: "l1", label: "Credit Card Balance", amount: 2400,  rate: 24.99 },
    { id: "l2", label: "Student Loans",        amount: 18500, rate: 5.5 },
    { id: "l3", label: "Auto Loan",            amount: 11200, rate: 6.9 },
  ],
};

export function netWorth(w: WealthProfile): number {
  const totalAssets = w.assets.reduce((s, a) => s + a.amount, 0);
  const totalLiabilities = w.liabilities.reduce((s, l) => s + l.amount, 0);
  return totalAssets - totalLiabilities;
}

export function liquidAssets(w: WealthProfile): number {
  return w.assets.filter((a) => a.type === "liquid").reduce((s, a) => s + a.amount, 0);
}

export function totalAssets(w: WealthProfile): number {
  return w.assets.reduce((s, a) => s + a.amount, 0);
}

export function totalLiabilities(w: WealthProfile): number {
  return w.liabilities.reduce((s, l) => s + l.amount, 0);
}

// 10x rule: can you afford this purchase?
// Checks high-APR debt (>6%) first — consistent with agent logic.
export function affordabilityCheck(
  purchaseAmount: number,
  liquid: number,
  monthly: number,
  liabilities: LiabilityEntry[] = [],
) {
  const tenX = purchaseAmount * 10;
  const monthsToAfford = tenX > liquid ? Math.ceil((tenX - liquid) / (monthly * 0.2)) : 0;
  const percentOfLiquid = liquid > 0 ? (purchaseAmount / liquid) * 100 : 100;

  // Step 1 — High-interest debt check (>6% APR, same threshold as agent)
  const highAPR = liabilities.filter((l) => l.amount > 0 && (l.rate ?? 0) > 6);
  if (highAPR.length > 0 && purchaseAmount > 100) {
    const worst = highAPR.reduce((a, b) => ((b.rate ?? 0) > (a.rate ?? 0) ? b : a));
    const totalHighDebt = highAPR.reduce((s, l) => s + l.amount, 0);
    return {
      verdict: "wait" as const,
      color: "#ef4444",
      message: `Pay off debt first. You have $${totalHighDebt.toLocaleString()} in debt above 6% APR (worst: ${worst.label} at ${worst.rate}%). Paying that off is a guaranteed ${worst.rate}% return — better than any purchase.`,
      tenX,
      canAfford: false,
      monthsToAfford,
      percentOfLiquid,
    };
  }

  // Step 2 — 10x liquid rule
  let verdict: "comfortable" | "caution" | "wait";
  let message: string;
  let color: string;

  if (liquid >= tenX) {
    verdict = "comfortable";
    color = "#52d9a0";
    message = percentOfLiquid < 1
      ? "Comfortable. This is a small fraction of your liquid assets."
      : `You can afford this. The purchase is ${percentOfLiquid.toFixed(1)}% of your liquid assets — within the 10x rule.`;
  } else if (liquid >= purchaseAmount * 3) {
    verdict = "caution";
    color = "#f59e6b";
    message = `Proceed with caution. You have ${(liquid / purchaseAmount).toFixed(1)}x this amount — below the 10x threshold. Consider waiting ${monthsToAfford} month${monthsToAfford !== 1 ? "s" : ""} to build more cushion.`;
  } else {
    verdict = "wait";
    color = "#ef4444";
    message = `Not recommended. You'd need $${tenX.toLocaleString()} in liquid savings for this purchase. Keep saving — ~${monthsToAfford} month${monthsToAfford !== 1 ? "s" : ""} away at a 20% savings rate.`;
  }

  return { verdict, message, color, tenX, canAfford: liquid >= tenX, monthsToAfford, percentOfLiquid };
}

// Seed localStorage with DEFAULT_WEALTH if the key has never been set.
// Call once at app start so AI Advisor always has financial context.
export function initWealthStorage() {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem("cardwise_wealth")) {
    localStorage.setItem("cardwise_wealth", JSON.stringify(DEFAULT_WEALTH));
  }
}

// Financial health insights
export function getInsights(w: WealthProfile, monthlySpend: number): string[] {
  const insights: string[] = [];
  const liquid = liquidAssets(w);
  const nw = netWorth(w);

  // Emergency fund: 3-6 months expenses
  const emergencyTarget = monthlySpend * 6;
  if (liquid < emergencyTarget) {
    const months = (liquid / monthlySpend).toFixed(1);
    insights.push(`⚠️ Your emergency fund covers ~${months} months of expenses. The goal is 6 months ($${emergencyTarget.toLocaleString()}).`);
  } else {
    insights.push(`✅ Your emergency fund is solid — covering ${(liquid / monthlySpend).toFixed(0)} months of expenses.`);
  }

  // Debt-to-income ratio
  const totalDebt = totalLiabilities(w);
  const annualIncome = w.monthlyIncome * 12;
  const dti = (totalDebt / annualIncome) * 100;
  if (dti > 36) {
    insights.push(`⚠️ Debt-to-income ratio is ${dti.toFixed(0)}%. Aim to keep it below 36% for financial health.`);
  } else {
    insights.push(`✅ Healthy debt-to-income ratio of ${dti.toFixed(0)}% — under the 36% threshold.`);
  }

  // High-interest debt (>6% APR — same threshold as agent affordability rules)
  const highDebt = w.liabilities.filter((l) => (l.rate || 0) > 6);
  if (highDebt.length > 0) {
    const total = highDebt.reduce((s, l) => s + l.amount, 0);
    const worst = highDebt.reduce((a, b) => ((b.rate || 0) > (a.rate || 0) ? b : a));
    insights.push(`⚠️ $${total.toLocaleString()} in debt above 6% APR (highest: ${worst.label} at ${worst.rate}%). Pay this off before discretionary purchases.`);
  }

  // Savings rate
  const savingsRate = ((w.monthlyIncome - monthlySpend) / w.monthlyIncome) * 100;
  if (savingsRate < 20) {
    insights.push(`💡 You're saving ~${Math.max(0, savingsRate).toFixed(0)}% of income. Aim for 20%+ to build wealth faster.`);
  } else {
    insights.push(`✅ Great savings rate of ${savingsRate.toFixed(0)}% — above the 20% target.`);
  }

  return insights;
}
