"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, Sparkles, ImagePlus, X, CreditCard, Zap } from "lucide-react";
import { sendChatMessage, analyzeMedia } from "../lib/api";
import type { ChatMessage } from "../lib/types";

interface Props {
  selectedCardIds: string[];
}

const SUGGESTED_PROMPTS = [
  "Which card should I use at a restaurant tonight?",
  "What credits am I forgetting to use?",
  "Is the Amex Platinum worth it for my spending?",
  "Build me a no-fee card stack that maximizes cashback",
  "Which card earns the most on groceries?",
  "How do I use my $300 Chase travel credit?",
];

interface MediaAnalysis {
  merchant?: string;
  amount?: number;
  category?: string;
  best_card_name?: string;
  earning_rate?: number;
  explanation?: string;
  tip?: string;
  raw?: string;
}

function formatAnalysisResult(r: MediaAnalysis): string {
  if (r.raw) return r.raw;
  const parts: string[] = [];
  if (r.merchant) parts.push(`**${r.merchant}**`);
  if (r.amount) parts.push(`$${r.amount.toFixed(2)} · ${r.category}`);
  if (r.best_card_name && r.earning_rate)
    parts.push(`Best card: **${r.best_card_name}** (${r.earning_rate}× on ${r.category})`);
  if (r.explanation) parts.push(r.explanation);
  if (r.tip) parts.push(`💡 ${r.tip}`);
  return parts.join("\n");
}

export default function AIChat({ selectedCardIds }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hey — I'm your CardWise AI advisor. I know your cards inside out and can tell you exactly which card to swipe, what credits you're leaving on the table, and whether a new card is actually worth it for your spending. What do you want to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2));
  const [listening, setListening] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    const url = URL.createObjectURL(file);
    setPendingPreview(url);
    // reset input so same file can be re-selected
    e.target.value = "";
  }

  function clearPendingFile() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
  }

  async function sendMessage(text: string) {
    if ((!text.trim() && !pendingFile) || loading) return;

    const mediaType = pendingFile
      ? pendingFile.type.startsWith("video/") ? "video" : "image"
      : undefined;
    const mediaUrl = pendingPreview ?? undefined;
    const fileToSend = pendingFile;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text || "Analyze this receipt", mediaUrl, mediaType },
    ]);
    setInput("");
    clearPendingFile();
    setLoading(true);

    const aiMsg: ChatMessage = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, aiMsg]);

    try {
      if (fileToSend) {
        // Vision analysis path
        const result: MediaAnalysis = await analyzeMedia(fileToSend, selectedCardIds);
        const formatted = formatAnalysisResult(result);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: formatted };
          return updated;
        });
      } else {
        // Text chat path
        await sendChatMessage(text, sessionId, selectedCardIds, (chunk) => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: updated[updated.length - 1].content + chunk,
            };
            return updated;
          });
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Couldn't reach the server. Make sure the backend is running on port 8000.",
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  function toggleVoice() {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Voice input requires Chrome or Edge.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: typeof window.webkitSpeechRecognition }).SpeechRecognition ||
      window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .map((r: SpeechRecognitionResult) => r[0].transcript)
        .join("");
      setInput(transcript);
    };

    recognition.onend = () => {
      setListening(false);
      setInput((current) => {
        if (current.trim()) setTimeout(() => sendMessage(current), 100);
        return current;
      });
    };

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 13rem)" }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-5 pb-4 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "rgba(195,109,187,0.15)", border: "1px solid rgba(195,109,187,0.2)" }}
              >
                <Sparkles size={13} style={{ color: "#c36dbb" }} />
              </div>
            )}

            <div className="max-w-[78%] flex flex-col gap-1.5">
              {/* Media preview in user message */}
              {msg.mediaUrl && msg.mediaType === "image" && (
                <img
                  src={msg.mediaUrl}
                  alt="receipt"
                  className="rounded-xl max-h-48 object-cover"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                />
              )}
              {msg.mediaUrl && msg.mediaType === "video" && (
                <video
                  src={msg.mediaUrl}
                  className="rounded-xl max-h-48"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                  controls
                />
              )}

              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user" ? "text-white rounded-tr-sm" : "text-[#ddd] rounded-tl-sm glass"
                }`}
                style={
                  msg.role === "user"
                    ? { background: "linear-gradient(135deg, #c36dbb, #8f8fbf)" }
                    : {}
                }
              >
                {/* Render bold via simple split */}
                {msg.role === "assistant"
                  ? msg.content.split(/\*\*(.+?)\*\*/g).map((part, pi) =>
                      pi % 2 === 1 ? <strong key={pi}>{part}</strong> : part
                    )
                  : msg.content}
                {msg.role === "assistant" && loading && i === messages.length - 1 && msg.content === "" && (
                  <span className="inline-flex gap-1 items-center">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: "#c36dbb", animationDelay: `${d}ms` }}
                      />
                    ))}
                  </span>
                )}
              </div>

              {/* Card recommendation pill from analysis */}
              {msg.role === "assistant" && msg.content.includes("Best card:") && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                  style={{ background: "rgba(195,109,187,0.08)", border: "1px solid rgba(195,109,187,0.15)" }}
                >
                  <CreditCard size={12} style={{ color: "#c36dbb" }} />
                  <span style={{ color: "#c36dbb" }}>Tap Spend Guide to see full card comparison</span>
                  <Zap size={11} style={{ color: "#c36dbb" }} />
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-white"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                U
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts — only on first load */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="glass text-xs text-[#999] hover:text-white rounded-full px-3 py-1.5 transition-colors glow-hover"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* File preview bar */}
      {pendingFile && pendingPreview && (
        <div
          className="flex items-center gap-3 px-3 py-2 rounded-xl mb-2"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(195,109,187,0.2)" }}
        >
          {pendingFile.type.startsWith("image/") ? (
            <img src={pendingPreview} alt="preview" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(195,109,187,0.12)" }}>
              <ImagePlus size={16} style={{ color: "#c36dbb" }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{pendingFile.name}</p>
            <p className="text-[#666] text-[10px]">{pendingFile.type.startsWith("video/") ? "Video — Gemini will analyze it" : "Image — receipt or purchase"}</p>
          </div>
          <button onClick={clearPendingFile} className="text-[#555] hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 items-end">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
            pendingFile ? "border border-[rgba(195,109,187,0.5)]" : "glass hover:border-[rgba(255,255,255,0.15)]"
          }`}
          title="Attach receipt or video"
          style={pendingFile ? { background: "rgba(195,109,187,0.12)" } : {}}
        >
          <ImagePlus size={16} style={{ color: pendingFile ? "#c36dbb" : "#777" }} />
        </button>

        <div
          className="flex-1 flex items-end rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={pendingFile ? "Add a question about this receipt (optional)..." : "Ask about your cards, a purchase, or your benefits..."}
            rows={1}
            className="flex-1 bg-transparent px-4 py-3 text-white text-sm placeholder-[#555] focus:outline-none resize-none"
          />
        </div>

        <button
          onClick={toggleVoice}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
            listening ? "bg-red-500/20 border border-red-500/40" : "glass hover:border-[rgba(255,255,255,0.15)]"
          }`}
          title="Voice input"
        >
          {listening ? (
            <MicOff size={16} className="text-red-400" />
          ) : (
            <Mic size={16} className="text-[#777]" />
          )}
        </button>

        <button
          onClick={() => sendMessage(input)}
          disabled={(!input.trim() && !pendingFile) || loading}
          className="w-11 h-11 rounded-xl flex items-center justify-center gradient-bg disabled:opacity-30 transition-opacity"
        >
          <Send size={16} className="text-white" />
        </button>
      </div>

      {listening && (
        <p className="text-center text-xs text-red-400 mt-2 animate-pulse">Listening...</p>
      )}
    </div>
  );
}
