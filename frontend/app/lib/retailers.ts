export interface RetailerMatch {
  category: string;
  categoryLabel: string;
  subcategory?: string;
  icon: string;
}

// Maps retailer/merchant names (lowercase) to spending categories
const RETAILER_MAP: Record<string, RetailerMatch> = {
  // Dining & Food
  "starbucks": { category: "dining", categoryLabel: "Dining", icon: "☕" },
  "mcdonald's": { category: "dining", categoryLabel: "Dining", icon: "🍔" },
  "mcdonalds": { category: "dining", categoryLabel: "Dining", icon: "🍔" },
  "chipotle": { category: "dining", categoryLabel: "Dining", icon: "🌯" },
  "nobu": { category: "dining", categoryLabel: "Dining", icon: "🍣" },
  "sushi": { category: "dining", categoryLabel: "Dining", icon: "🍣" },
  "chick-fil-a": { category: "dining", categoryLabel: "Dining", icon: "🍗" },
  "chick fil a": { category: "dining", categoryLabel: "Dining", icon: "🍗" },
  "taco bell": { category: "dining", categoryLabel: "Dining", icon: "🌮" },
  "subway": { category: "dining", categoryLabel: "Dining", icon: "🥖" },
  "dunkin": { category: "dining", categoryLabel: "Dining", icon: "☕" },
  "panera": { category: "dining", categoryLabel: "Dining", icon: "🥗" },
  "doordash": { category: "dining", categoryLabel: "Dining", icon: "🚪" },
  "grubhub": { category: "dining", categoryLabel: "Dining", icon: "🛵" },
  "uber eats": { category: "dining", categoryLabel: "Dining", icon: "🚗" },
  "seamless": { category: "dining", categoryLabel: "Dining", icon: "🍽️" },
  "five guys": { category: "dining", categoryLabel: "Dining", icon: "🍔" },
  "cheesecake factory": { category: "dining", categoryLabel: "Dining", icon: "🎂" },
  "shake shack": { category: "dining", categoryLabel: "Dining", icon: "🍔" },
  "sweetgreen": { category: "dining", categoryLabel: "Dining", icon: "🥗" },
  "pizza": { category: "dining", categoryLabel: "Dining", icon: "🍕" },
  "dominos": { category: "dining", categoryLabel: "Dining", icon: "🍕" },
  "domino's": { category: "dining", categoryLabel: "Dining", icon: "🍕" },
  "restaurant": { category: "dining", categoryLabel: "Dining", icon: "🍽️" },
  "bar": { category: "dining", categoryLabel: "Dining", icon: "🍺" },
  "cafe": { category: "dining", categoryLabel: "Dining", icon: "☕" },
  "coffee": { category: "dining", categoryLabel: "Dining", icon: "☕" },

  // Groceries
  "whole foods": { category: "groceries", categoryLabel: "Groceries", icon: "🛒" },
  "whole foods market": { category: "groceries", categoryLabel: "Groceries", icon: "🛒" },
  "trader joe's": { category: "groceries", categoryLabel: "Groceries", icon: "🛒" },
  "trader joes": { category: "groceries", categoryLabel: "Groceries", icon: "🛒" },
  "kroger": { category: "groceries", categoryLabel: "Groceries", icon: "🛒" },
  "safeway": { category: "groceries", categoryLabel: "Groceries", icon: "🛒" },
  "wegmans": { category: "groceries", categoryLabel: "Groceries", icon: "🛒" },
  "publix": { category: "groceries", categoryLabel: "Groceries", icon: "🛒" },
  "aldi": { category: "groceries", categoryLabel: "Groceries", icon: "🛒" },
  "costco": { category: "groceries", categoryLabel: "Groceries", icon: "📦" },
  "sam's club": { category: "groceries", categoryLabel: "Groceries", icon: "📦" },
  "fresh market": { category: "groceries", categoryLabel: "Groceries", icon: "🛒" },
  "stop & shop": { category: "groceries", categoryLabel: "Groceries", icon: "🛒" },
  "grocery": { category: "groceries", categoryLabel: "Groceries", icon: "🛒" },
  "supermarket": { category: "groceries", categoryLabel: "Groceries", icon: "🛒" },

  // Travel - Airlines
  "delta": { category: "flights_direct", categoryLabel: "Airlines", icon: "✈️", subcategory: "Delta" },
  "delta airlines": { category: "flights_direct", categoryLabel: "Airlines", icon: "✈️" },
  "united": { category: "flights_direct", categoryLabel: "Airlines", icon: "✈️" },
  "united airlines": { category: "flights_direct", categoryLabel: "Airlines", icon: "✈️" },
  "american airlines": { category: "flights_direct", categoryLabel: "Airlines", icon: "✈️" },
  "southwest": { category: "flights_direct", categoryLabel: "Airlines", icon: "✈️" },
  "jetblue": { category: "flights_direct", categoryLabel: "Airlines", icon: "✈️" },
  "spirit": { category: "flights_direct", categoryLabel: "Airlines", icon: "✈️" },
  "frontier": { category: "flights_direct", categoryLabel: "Airlines", icon: "✈️" },
  "alaska airlines": { category: "flights_direct", categoryLabel: "Airlines", icon: "✈️" },
  "flight": { category: "flights_direct", categoryLabel: "Airlines", icon: "✈️" },
  "flights": { category: "flights_direct", categoryLabel: "Airlines", icon: "✈️" },
  "airline": { category: "flights_direct", categoryLabel: "Airlines", icon: "✈️" },

  // Travel - Hotels
  "marriott": { category: "hotels", categoryLabel: "Hotels", icon: "🏨" },
  "hilton": { category: "hotels", categoryLabel: "Hotels", icon: "🏨" },
  "hyatt": { category: "hotels", categoryLabel: "Hotels", icon: "🏨" },
  "ihg": { category: "hotels", categoryLabel: "Hotels", icon: "🏨" },
  "intercontinental": { category: "hotels", categoryLabel: "Hotels", icon: "🏨" },
  "westin": { category: "hotels", categoryLabel: "Hotels", icon: "🏨" },
  "sheraton": { category: "hotels", categoryLabel: "Hotels", icon: "🏨" },
  "four seasons": { category: "hotels", categoryLabel: "Hotels", icon: "🏨" },
  "ritz carlton": { category: "hotels", categoryLabel: "Hotels", icon: "🏨" },
  "w hotel": { category: "hotels", categoryLabel: "Hotels", icon: "🏨" },
  "airbnb": { category: "travel_other", categoryLabel: "Travel", icon: "🏠" },
  "hotel": { category: "hotels", categoryLabel: "Hotels", icon: "🏨" },
  "motel": { category: "hotels", categoryLabel: "Hotels", icon: "🏨" },

  // Travel - Rideshare
  "uber": { category: "travel_other", categoryLabel: "Travel / Rideshare", icon: "🚗" },
  "lyft": { category: "travel_other", categoryLabel: "Travel / Rideshare", icon: "🚕" },

  // Gas
  "shell": { category: "gas", categoryLabel: "Gas", icon: "⛽" },
  "bp": { category: "gas", categoryLabel: "Gas", icon: "⛽" },
  "exxon": { category: "gas", categoryLabel: "Gas", icon: "⛽" },
  "chevron": { category: "gas", categoryLabel: "Gas", icon: "⛽" },
  "mobil": { category: "gas", categoryLabel: "Gas", icon: "⛽" },
  "speedway": { category: "gas", categoryLabel: "Gas", icon: "⛽" },
  "circle k": { category: "gas", categoryLabel: "Gas", icon: "⛽" },
  "7-eleven": { category: "gas", categoryLabel: "Gas", icon: "⛽" },
  "7 eleven": { category: "gas", categoryLabel: "Gas", icon: "⛽" },
  "gas station": { category: "gas", categoryLabel: "Gas", icon: "⛽" },
  "gas": { category: "gas", categoryLabel: "Gas", icon: "⛽" },

  // Apple ecosystem
  "apple": { category: "apple_purchases", categoryLabel: "Apple / Electronics", icon: "🍎" },
  "apple store": { category: "apple_purchases", categoryLabel: "Apple Store", icon: "🍎" },
  "apple.com": { category: "apple_purchases", categoryLabel: "Apple Online", icon: "🍎" },
  "apple pay": { category: "apple_pay", categoryLabel: "Apple Pay", icon: "📱" },

  // Streaming & Entertainment
  "netflix": { category: "streaming", categoryLabel: "Streaming", icon: "🎬" },
  "hulu": { category: "streaming", categoryLabel: "Streaming", icon: "📺" },
  "disney+": { category: "streaming", categoryLabel: "Streaming", icon: "🏰" },
  "disney plus": { category: "streaming", categoryLabel: "Streaming", icon: "🏰" },
  "hbo": { category: "streaming", categoryLabel: "Streaming", icon: "📺" },
  "max": { category: "streaming", categoryLabel: "Streaming", icon: "📺" },
  "spotify": { category: "streaming", categoryLabel: "Streaming", icon: "🎵" },
  "apple music": { category: "streaming", categoryLabel: "Streaming", icon: "🎵" },
  "amazon prime": { category: "streaming", categoryLabel: "Streaming", icon: "📦" },
  "peacock": { category: "streaming", categoryLabel: "Streaming", icon: "📺" },
  "paramount": { category: "streaming", categoryLabel: "Streaming", icon: "📺" },
  "youtube premium": { category: "streaming", categoryLabel: "Streaming", icon: "▶️" },
  "movie": { category: "entertainment", categoryLabel: "Entertainment", icon: "🎬" },
  "theater": { category: "entertainment", categoryLabel: "Entertainment", icon: "🎭" },
  "concert": { category: "entertainment", categoryLabel: "Entertainment", icon: "🎤" },
  "ticketmaster": { category: "entertainment", categoryLabel: "Entertainment", icon: "🎟️" },
  "amc": { category: "entertainment", categoryLabel: "Entertainment", icon: "🎬" },
  "regal": { category: "entertainment", categoryLabel: "Entertainment", icon: "🎬" },

  // Drugstores
  "cvs": { category: "drugstore", categoryLabel: "Drugstore", icon: "💊" },
  "walgreens": { category: "drugstore", categoryLabel: "Drugstore", icon: "💊" },
  "rite aid": { category: "drugstore", categoryLabel: "Drugstore", icon: "💊" },
  "pharmacy": { category: "drugstore", categoryLabel: "Drugstore", icon: "💊" },

  // General retail
  "amazon": { category: "other", categoryLabel: "Shopping", icon: "📦" },
  "walmart": { category: "other", categoryLabel: "Shopping", icon: "🏪" },
  "target": { category: "other", categoryLabel: "Shopping", icon: "🎯" },
  "best buy": { category: "other", categoryLabel: "Electronics", icon: "🔌" },
  "home depot": { category: "other", categoryLabel: "Home Improvement", icon: "🔨" },
  "lowe's": { category: "other", categoryLabel: "Home Improvement", icon: "🔨" },
  "lowes": { category: "other", categoryLabel: "Home Improvement", icon: "🔨" },
  "ikea": { category: "other", categoryLabel: "Furniture", icon: "🛋️" },
  "nordstrom": { category: "other", categoryLabel: "Shopping", icon: "👗" },
  "macy's": { category: "other", categoryLabel: "Shopping", icon: "👗" },
  "macys": { category: "other", categoryLabel: "Shopping", icon: "👗" },
  "zara": { category: "other", categoryLabel: "Shopping", icon: "👗" },
  "h&m": { category: "other", categoryLabel: "Shopping", icon: "👗" },
  "nike": { category: "other", categoryLabel: "Shopping", icon: "👟" },
  "adidas": { category: "other", categoryLabel: "Shopping", icon: "👟" },
  "saks": { category: "other", categoryLabel: "Luxury Shopping", icon: "🛍️" },
  "saks fifth avenue": { category: "other", categoryLabel: "Luxury Shopping", icon: "🛍️" },
  "neiman marcus": { category: "other", categoryLabel: "Luxury Shopping", icon: "🛍️" },
};

export function lookupRetailer(query: string): RetailerMatch | null {
  const q = query.toLowerCase().trim();
  // Exact match first
  if (RETAILER_MAP[q]) return RETAILER_MAP[q];
  // Partial match
  for (const [key, val] of Object.entries(RETAILER_MAP)) {
    if (q.includes(key) || key.includes(q)) return val;
  }
  return null;
}

// Map card earning_rate keys → lookup categories
export const CATEGORY_ALIASES: Record<string, string[]> = {
  dining: ["dining"],
  groceries: ["groceries"],
  travel_other: ["travel_other", "travel", "rideshare"],
  flights_direct: ["flights_direct", "airlines", "airline", "flight"],
  flights_amex_travel: ["flights_amex_travel"],
  hotels: ["hotels", "hotel"],
  gas: ["gas"],
  streaming: ["streaming", "digital_entertainment"],
  entertainment: ["entertainment"],
  drugstore: ["drugstore"],
  apple_purchases: ["apple_purchases", "apple"],
  apple_pay: ["apple_pay"],
  other: ["other", "shopping", "electronics", "general"],
};

// Given a match category, find the best earning rate key for a card
export function bestRateForCategory(
  earningRates: Record<string, number>,
  category: string
): { rate: number; key: string } {
  // Try the category directly
  if (earningRates[category] !== undefined) {
    return { rate: earningRates[category], key: category };
  }
  // Try aliases
  const aliases = CATEGORY_ALIASES[category] || [];
  for (const alias of aliases) {
    if (earningRates[alias] !== undefined) {
      return { rate: earningRates[alias], key: alias };
    }
  }
  // Fall back to "other"
  return { rate: earningRates["other"] ?? 1, key: "other" };
}
