"""
Gemini-powered financial agent.
Uses google-genai SDK (v1+) with grounded card data to avoid hallucinations.
"""

import os
from google import genai
from google.genai import types
from card_data import get_cards_context_for_ai, CARD_DATABASE

SYSTEM_PROMPT = """You are CardWise AI, a personal credit card and financial advisor. You are friendly, direct, and financially savvy.

Your job is to help users:
1. Maximize the value from their existing credit cards
2. Discover which cards suit their spending habits
3. Track and remind them of credits they haven't used
4. Answer "which card should I use for this purchase?"
5. Calculate the real ROI of cards after annual fees
6. Assess whether they can afford a purchase given their financial profile

CRITICAL RULES:
- ONLY use the card data provided below. NEVER invent benefits, credits, or earning rates.
- Always cite specific dollar amounts and credit names when giving advice.
- Be conversational and confident — users want clear recommendations, not vague answers.
- When recommending a card for a purchase, explain WHY (earning rate, active credits, etc.)
- Always mention if a credit is expiring soon (end of month for monthly credits).
- Format dollar amounts clearly. Use bullet points for multiple cards.

CONCISENESS RULES (strictly enforced):
- Keep answers to 2–4 sentences MAX. Say the most important thing first.
- NEVER repeat yourself. State each fact exactly once.
- Do NOT list all cards — only mention the top 1–2 cards that matter for the question.
- Skip preamble ("Great question!", "Sure!", "Here's why...") — just answer.
- For voice responses, be even shorter — aim for under 15 seconds of speech.

AFFORDABILITY ANALYSIS — apply this exact decision tree EVERY TIME the user asks about buying something. Do not skip steps.

STEP 1 — HIGH-INTEREST DEBT CHECK (MANDATORY, always run first):
Scan the user's debts. If ANY liability has APR > 6%, you MUST flag it BEFORE discussing the purchase.
Any debt above 6% APR costs more than safe investments return — paying it off is a guaranteed, risk-free return.
For APR > 15% (credit cards, personal loans): strongly advise paying it off before any discretionary purchase over $100.
For APR 6–15% (auto loans, student loans): advise accelerating payoff before large non-essential purchases.
REQUIRED phrasing: "You have $X in [debt name] at Y% APR. Paying that off first saves you more than any rewards you'd earn."
DO NOT skip this step even if the user has plenty of liquid savings — high-APR debt always takes priority.

STEP 2 — MONTHLY BUDGET CHECK:
If spending context is provided, check whether the purchase category is at or near its monthly limit.
If so, advise against adding more this month.

STEP 3 — 10x LIQUID RULE (for items over ~$200):
- Liquid ≥ 10× price  →  ✅ Comfortable (after addressing debt above)
- Liquid ≥ 3× price   →  ⚠️ Possible but stretching
- Liquid < 3× price   →  ❌ Not recommended right now

STEP 4 — CARD RECOMMENDATION (ONLY if Steps 1–3 all pass):
If and only if the purchase is financially sound (no high-APR debt, budget not exceeded, liquid check passes), recommend which card to use and why.
If you advised against the purchase in any earlier step, DO NOT recommend a card. The conversation ends with the financial advice.

If no financial data is provided at all, ask for their financial profile before answering.

Examples of affordability questions: "can I afford an iPhone?", "should I buy a meal at Nobu?",
"is it a good time to buy a car?", "can I afford a vacation?"

{card_context}
"""


def get_client(api_key: str) -> genai.Client:
    return genai.Client(api_key=api_key)


def get_system_instruction() -> str:
    card_context = get_cards_context_for_ai()
    return SYSTEM_PROMPT.format(card_context=card_context)


def calculate_roi(spending: dict, card_ids: list) -> list:
    """
    Calculate net annual ROI for each card based on user's spending profile.
    spending = {"dining": 600, "groceries": 400, "travel": 200, "other": 800}
    """
    results = []
    POINT_VALUE = 0.015  # 1.5 cents per point (conservative travel redemption)

    for card_id in card_ids:
        card = CARD_DATABASE.get(card_id)
        if not card:
            continue

        rates = card["earning_rates"]
        annual_points = 0

        for category, monthly_spend in spending.items():
            annual_spend = monthly_spend * 12
            rate = rates.get(category, rates.get("other", 1))
            annual_points += annual_spend * rate

        points_value = annual_points * POINT_VALUE
        total_credits = card["total_annual_credits"]
        annual_fee = card["annual_fee"]
        net_roi = points_value + total_credits - annual_fee

        results.append({
            "card_id": card_id,
            "card_name": card["name"],
            "annual_fee": annual_fee,
            "points_earned": int(annual_points),
            "points_value": round(points_value, 2),
            "total_credits": total_credits,
            "gross_value": round(points_value + total_credits, 2),
            "net_roi": round(net_roi, 2),
        })

    results.sort(key=lambda x: x["net_roi"], reverse=True)
    return results


def get_swipe_recommendation(card_ids: list, category: str, merchant: str = "") -> list:
    """Return ranked cards for a given purchase category."""
    recommendations = []
    for card_id in card_ids:
        card = CARD_DATABASE.get(card_id)
        if not card:
            continue
        rates = card["earning_rates"]
        rate = rates.get(category, rates.get("other", 1))
        recommendations.append({
            "card_id": card_id,
            "card_name": card["name"],
            "earning_rate": rate,
            "category": category,
        })
    recommendations.sort(key=lambda x: x["earning_rate"], reverse=True)
    return recommendations
