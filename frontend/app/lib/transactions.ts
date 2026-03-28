export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  amount: number;
  category: keyof typeof CATEGORY_META;
  icon: string;
  cardId?: string; // which card was used
}

export const CATEGORY_META = {
  dining: { label: "Dining", color: "#c36dbb", icon: "🍽️" },
  groceries: { label: "Groceries", color: "#8f8fbf", icon: "🛒" },
  travel: { label: "Travel", color: "#7b9fff", icon: "✈️" },
  gas: { label: "Gas", color: "#f59e6b", icon: "⛽" },
  entertainment: { label: "Entertainment", color: "#52d9a0", icon: "🎬" },
  shopping: { label: "Shopping", color: "#fb923c", icon: "🛍️" },
  subscriptions: { label: "Subscriptions", color: "#a78bfa", icon: "📱" },
  health: { label: "Health", color: "#34d399", icon: "💊" },
  other: { label: "Other", color: "#3d3d55", icon: "💳" },
} as const;

// Mock transactions for March 2026
export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "t1",  date: "2026-03-28", merchant: "Starbucks",           amount: 7.50,   category: "dining",        icon: "☕" },
  { id: "t2",  date: "2026-03-27", merchant: "Whole Foods Market",  amount: 94.32,  category: "groceries",     icon: "🛒" },
  { id: "t3",  date: "2026-03-27", merchant: "Uber",                amount: 18.40,  category: "travel",        icon: "🚗" },
  { id: "t4",  date: "2026-03-26", merchant: "Nobu NYC",            amount: 186.00, category: "dining",        icon: "🍣" },
  { id: "t5",  date: "2026-03-26", merchant: "Shell Gas Station",   amount: 61.20,  category: "gas",           icon: "⛽" },
  { id: "t6",  date: "2026-03-25", merchant: "Netflix",             amount: 15.49,  category: "subscriptions", icon: "🎬" },
  { id: "t7",  date: "2026-03-25", merchant: "Trader Joe's",        amount: 67.88,  category: "groceries",     icon: "🛒" },
  { id: "t8",  date: "2026-03-24", merchant: "Delta Airlines",      amount: 342.00, category: "travel",        icon: "✈️" },
  { id: "t9",  date: "2026-03-24", merchant: "Chipotle",            amount: 14.25,  category: "dining",        icon: "🌯" },
  { id: "t10", date: "2026-03-23", merchant: "Apple Store",         amount: 129.00, category: "shopping",      icon: "🍎" },
  { id: "t11", date: "2026-03-23", merchant: "Spotify",             amount: 9.99,   category: "subscriptions", icon: "🎵" },
  { id: "t12", date: "2026-03-22", merchant: "CVS Pharmacy",        amount: 28.45,  category: "health",        icon: "💊" },
  { id: "t13", date: "2026-03-22", merchant: "Sweetgreen",          amount: 17.80,  category: "dining",        icon: "🥗" },
  { id: "t14", date: "2026-03-21", merchant: "Amazon",              amount: 54.99,  category: "shopping",      icon: "📦" },
  { id: "t15", date: "2026-03-21", merchant: "Wegmans",             amount: 112.60, category: "groceries",     icon: "🛒" },
  { id: "t16", date: "2026-03-20", merchant: "Shake Shack",         amount: 22.40,  category: "dining",        icon: "🍔" },
  { id: "t17", date: "2026-03-20", merchant: "Disney+",             amount: 13.99,  category: "subscriptions", icon: "🏰" },
  { id: "t18", date: "2026-03-19", merchant: "Lyft",                amount: 24.10,  category: "travel",        icon: "🚕" },
  { id: "t19", date: "2026-03-19", merchant: "Target",              amount: 87.23,  category: "shopping",      icon: "🎯" },
  { id: "t20", date: "2026-03-18", merchant: "Dunkin'",             amount: 6.75,   category: "dining",        icon: "☕" },
  { id: "t21", date: "2026-03-18", merchant: "Exxon",               amount: 54.00,  category: "gas",           icon: "⛽" },
  { id: "t22", date: "2026-03-17", merchant: "Five Guys",           amount: 19.60,  category: "dining",        icon: "🍔" },
  { id: "t23", date: "2026-03-17", merchant: "Hulu",                amount: 17.99,  category: "subscriptions", icon: "📺" },
  { id: "t24", date: "2026-03-16", merchant: "Marriott",            amount: 218.00, category: "travel",        icon: "🏨" },
  { id: "t25", date: "2026-03-15", merchant: "Whole Foods Market",  amount: 78.14,  category: "groceries",     icon: "🛒" },
  { id: "t26", date: "2026-03-15", merchant: "Ticketmaster",        amount: 145.00, category: "entertainment", icon: "🎟️" },
  { id: "t27", date: "2026-03-14", merchant: "Starbucks",           amount: 8.20,   category: "dining",        icon: "☕" },
  { id: "t28", date: "2026-03-14", merchant: "Best Buy",            amount: 199.99, category: "shopping",      icon: "🔌" },
  { id: "t29", date: "2026-03-13", merchant: "Panera Bread",        amount: 13.45,  category: "dining",        icon: "🥖" },
  { id: "t30", date: "2026-03-12", merchant: "Uber Eats",           amount: 38.70,  category: "dining",        icon: "🚪" },
  { id: "t31", date: "2026-03-11", merchant: "Costco",              amount: 143.22, category: "groceries",     icon: "📦" },
  { id: "t32", date: "2026-03-10", merchant: "AMC Theaters",        amount: 34.00,  category: "entertainment", icon: "🎬" },
  { id: "t33", date: "2026-03-09", merchant: "Cheesecake Factory",  amount: 76.40,  category: "dining",        icon: "🎂" },
  { id: "t34", date: "2026-03-08", merchant: "Shell Gas Station",   amount: 58.00,  category: "gas",           icon: "⛽" },
  { id: "t35", date: "2026-03-07", merchant: "Nike.com",            amount: 110.00, category: "shopping",      icon: "👟" },
  { id: "t36", date: "2026-03-06", merchant: "DoorDash",            amount: 42.15,  category: "dining",        icon: "🛵" },
  { id: "t37", date: "2026-03-05", merchant: "Walgreens",           amount: 19.85,  category: "health",        icon: "💊" },
  { id: "t38", date: "2026-03-04", merchant: "Hyatt",               amount: 189.00, category: "travel",        icon: "🏨" },
  { id: "t39", date: "2026-03-03", merchant: "Trader Joe's",        amount: 55.30,  category: "groceries",     icon: "🛒" },
  { id: "t40", date: "2026-03-02", merchant: "McDonald's",          amount: 11.40,  category: "dining",        icon: "🍔" },
  { id: "t41", date: "2026-03-01", merchant: "Amazon Prime",        amount: 14.99,  category: "subscriptions", icon: "📦" },
  { id: "t42", date: "2026-03-01", merchant: "Gym Membership",      amount: 49.00,  category: "health",        icon: "💪" },
];

export type CategoryKey = keyof typeof CATEGORY_META;

export function aggregateByCategory(transactions: Transaction[]): Record<CategoryKey, number> {
  const result = {} as Record<CategoryKey, number>;
  for (const t of transactions) {
    result[t.category] = (result[t.category] || 0) + t.amount;
  }
  return result;
}

export function totalSpend(transactions: Transaction[]): number {
  return transactions.reduce((s, t) => s + t.amount, 0);
}

// Map our transaction categories to card earning_rate keys
export const CATEGORY_TO_CARD_RATE: Record<CategoryKey, string[]> = {
  dining:        ["dining"],
  groceries:     ["groceries"],
  travel:        ["travel_other", "travel", "travel_chase_portal"],
  gas:           ["gas"],
  entertainment: ["entertainment", "streaming"],
  shopping:      ["apple_purchases", "other"],
  subscriptions: ["streaming", "digital_entertainment", "other"],
  health:        ["drugstore", "other"],
  other:         ["other"],
};
