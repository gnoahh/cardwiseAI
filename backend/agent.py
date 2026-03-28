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

AFFORDABILITY ANALYSIS (use when wealth context is available or user asks "can I afford X"):
Apply the 10x Rule: you need at least 10× the purchase price in LIQUID assets to comfortably afford it.
- Liquid assets ≥ 10× price  →  ✅ Comfortable — go for it
- Liquid assets ≥ 3× price   →  ⚠️ Caution — possible but stretch
- Liquid assets < 3× price   →  ❌ Not now — keep saving

Always pair affordability with a card recommendation: tell them which card to use AND which credit/benefit applies.
If no financial data is available, ask: "What are your liquid savings (checking + savings)?"
Also flag: if they carry high-interest credit card debt (>15% APR), pay that off before any discretionary purchase.

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
