export interface CardCredit {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  annual_value: number;
  merchants: string[];
  description: string;
  expires: string;
  how_to_use?: string;
  link?: string;
  link_label?: string;
  tip?: string;
  auto_detected?: boolean;
  used?: number;
}

export interface Card {
  id: string;
  name: string;
  network: string;
  annual_fee: number;
  no_annual_fee?: boolean;
  cashback_highlight?: string;
  color: string;
  earning_rates: Record<string, number>;
  credits: CardCredit[];
  total_annual_credits: number;
  net_value_after_fee: number;
  best_for: string[];
  transfer_partners: string[];
  perks?: string[];
}

export interface ROIResult {
  card_id: string;
  card_name: string;
  annual_fee: number;
  points_earned: number;
  points_value: number;
  total_credits: number;
  gross_value: number;
  net_roi: number;
}

export interface SpendingProfile {
  dining: number;
  groceries: number;
  travel: number;
  gas: number;
  entertainment: number;
  other: number;
  [key: string]: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  mediaUrl?: string;   // blob URL for display
  mediaType?: "image" | "video";
}
