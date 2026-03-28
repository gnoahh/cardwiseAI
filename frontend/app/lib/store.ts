"use client";

import { useState, useEffect } from "react";
import type { Card, SpendingProfile } from "./types";

const STORAGE_KEY = "cardwise_user_data";

interface UserData {
  selectedCardIds: string[];
  creditUsage: Record<string, Record<string, number>>; // cardId -> creditId -> used amount
  spending: SpendingProfile;
}

const DEFAULT_DATA: UserData = {
  selectedCardIds: [],
  creditUsage: {},
  spending: {
    dining: 500,
    groceries: 400,
    travel: 300,
    gas: 150,
    entertainment: 100,
    other: 600,
  },
};

export function useUserData() {
  const [data, setData] = useState<UserData>(DEFAULT_DATA);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  function save(updated: UserData) {
    setData(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function toggleCard(cardId: string) {
    const ids = data.selectedCardIds.includes(cardId)
      ? data.selectedCardIds.filter((id) => id !== cardId)
      : [...data.selectedCardIds, cardId];
    save({ ...data, selectedCardIds: ids });
  }

  function setSelectedCardIds(ids: string[]) {
    save({ ...data, selectedCardIds: ids });
  }

  function markCreditUsed(cardId: string, creditId: string, amount: number) {
    const usage = { ...data.creditUsage };
    usage[cardId] = { ...(usage[cardId] || {}), [creditId]: amount };
    save({ ...data, creditUsage: usage });
  }

  function updateSpending(spending: SpendingProfile) {
    save({ ...data, spending });
  }

  function getCreditUsed(cardId: string, creditId: string): number {
    return data.creditUsage[cardId]?.[creditId] ?? 0;
  }

  return {
    selectedCardIds: data.selectedCardIds,
    spending: data.spending,
    toggleCard,
    setSelectedCardIds,
    markCreditUsed,
    updateSpending,
    getCreditUsed,
  };
}
