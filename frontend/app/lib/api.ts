const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchCards() {
  const res = await fetch(`${API_BASE}/cards`);
  return res.json();
}

export async function fetchROI(spending: Record<string, number>, cardIds: string[]) {
  const res = await fetch(`${API_BASE}/roi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spending, card_ids: cardIds }),
  });
  return res.json();
}

export async function sendChatMessage(
  message: string,
  sessionId: string,
  userCards: string[],
  onChunk: (text: string) => void
) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId, user_cards: userCards }),
  });

  if (!res.ok) throw new Error("Chat request failed");
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

export async function analyzeMedia(file: File, cardIds: string[]) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_cards", JSON.stringify(cardIds));

  const res = await fetch(`${API_BASE}/analyze-media`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Analysis failed");
  return res.json();
}
