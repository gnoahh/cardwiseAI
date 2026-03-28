"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, CameraOff, X, Sparkles, Send, Radio, MessageSquare } from "lucide-react";

interface Props {
  selectedCardIds: string[];
}

type Mode = "chat" | "voice";
type LiveState = "idle" | "connecting" | "listening" | "speaking" | "error";

interface Turn {
  role: "user" | "ai";
  text: string;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");
const WS_BASE  = API_BASE.replace("https://", "wss://").replace("http://", "ws://");

// ── Audio helpers ─────────────────────────────────────────────────────────────

function resampleTo16k(buf: Float32Array, srcRate: number): Float32Array {
  if (srcRate === 16000) return buf;
  const ratio = srcRate / 16000;
  const len = Math.floor(buf.length / ratio);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const pos = i * ratio;
    const lo  = Math.floor(pos);
    out[i] = buf[lo] * (1 - (pos - lo)) + (buf[lo + 1] ?? buf[lo]) * (pos - lo);
  }
  return out;
}

function toInt16(f32: Float32Array): Int16Array {
  const i16 = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++)
    i16[i] = Math.max(-32768, Math.min(32767, f32[i] * 32768));
  return i16;
}

function scheduleAudio(
  ctx: AudioContext,
  nextTimeRef: React.MutableRefObject<number>,
  b64: string,
) {
  const binary = atob(b64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const i16 = new Int16Array(bytes.buffer);
  const f32 = new Float32Array(i16.length);
  for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768;
  const buf = ctx.createBuffer(1, f32.length, 24000);
  buf.getChannelData(0).set(f32);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  const startAt = Math.max(ctx.currentTime + 0.04, nextTimeRef.current);
  src.start(startAt);
  nextTimeRef.current = startAt + buf.duration;
}

// ── Wealth context (from WealthTracker localStorage) ─────────────────────────

function getWealthSummary(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem("cardwise_wealth");
    if (!raw) return "";
    const w = JSON.parse(raw);
    const liquid  = (w.assets || []).filter((a: { type: string }) => a.type === "liquid")
                      .reduce((s: number, a: { amount: number }) => s + a.amount, 0);
    const total   = (w.assets || []).reduce((s: number, a: { amount: number }) => s + a.amount, 0);
    const debts   = (w.liabilities || []).reduce((s: number, l: { amount: number }) => s + l.amount, 0);
    const nw      = total - debts;
    const income  = w.monthlyIncome ?? 0;
    return `net worth $${nw.toLocaleString()}, liquid assets $${liquid.toLocaleString()}, total assets $${total.toLocaleString()}, total liabilities $${debts.toLocaleString()}, monthly income $${income.toLocaleString()}`;
  } catch { return ""; }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LiveAdvisor({ selectedCardIds }: Props) {
  const [mode, setMode]               = useState<Mode>("chat");
  const [turns, setTurns]             = useState<Turn[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [textInput, setTextInput]     = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Voice-specific state
  const [liveState, setLiveState]     = useState<LiveState>("idle");
  const [audioLevel, setAudioLevel]   = useState(0);
  const [cameraOn, setCameraOn]       = useState(false);
  const [pttMode]                     = useState(true);  // always PTT — reliable
  const [pttActive, setPttActive]     = useState(false);
  const [errorMsg, setErrorMsg]       = useState("");

  // Stable session ID (shared across chat + voice so server history is consistent)
  const sessionId      = useRef(crypto.randomUUID());
  const wsRef          = useRef<WebSocket | null>(null);
  const captureCtxRef  = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const processorRef   = useRef<ScriptProcessorNode | null>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const videoRef       = useRef<HTMLVideoElement>(null);
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const nextPlayTime   = useRef(0);
  const transcriptRef  = useRef<HTMLDivElement>(null);
  const pttActiveRef   = useRef(false);
  const turnsRef       = useRef<Turn[]>([]);

  useEffect(() => { pttActiveRef.current = pttActive; }, [pttActive]);
  useEffect(() => { turnsRef.current = turns; }, [turns]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, streamingText]);

  // ── Chat mode ───────────────────────────────────────────────────────────────

  async function sendChatMessage(overrideText?: string) {
    const message = (overrideText ?? textInput).trim();
    if (!message || chatLoading) return;
    setTextInput("");
    setTurns(t => [...t, { role: "user", text: message }]);
    setChatLoading(true);
    setStreamingText("");

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          session_id: sessionId.current,
          user_cards: selectedCardIds,
          wealth_context: getWealthSummary(),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setStreamingText(accumulated);
      }
      setTurns(t => [...t, { role: "ai", text: accumulated }]);
    } catch (err) {
      setTurns(t => [...t, { role: "ai", text: `Sorry, something went wrong. (${err})` }]);
    } finally {
      setStreamingText("");
      setChatLoading(false);
    }
  }

  // ── Voice mode — cleanup ────────────────────────────────────────────────────

  const cleanupVoice = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    captureCtxRef.current?.close().catch(() => {});
    captureCtxRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    setAudioLevel(0);
  }, []);

  const stopCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  function startMicCapture(ws: WebSocket, ctx: AudioContext) {
    const nativeRate = ctx.sampleRate;
    const source     = ctx.createMediaStreamSource(streamRef.current!);
    const processor  = ctx.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      if (!pttActiveRef.current) return;  // PTT: only send while held
      const raw = e.inputBuffer.getChannelData(0);
      let rms = 0;
      for (let i = 0; i < raw.length; i++) rms += raw[i] * raw[i];
      setAudioLevel(Math.min(1, Math.sqrt(rms / raw.length) * 8));
      ws.send(toInt16(resampleTo16k(raw, nativeRate)).buffer);
    };

    source.connect(processor);
    processor.connect(ctx.destination);
    processorRef.current = processor;
  }

  async function startVoiceSession() {
    setLiveState("connecting");
    setErrorMsg("");

    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
    } catch {
      setErrorMsg("Microphone access denied.");
      setLiveState("error");
      return;
    }
    streamRef.current = micStream;

    const captureCtx  = new AudioContext();
    await captureCtx.resume();
    captureCtxRef.current = captureCtx;

    const playbackCtx = new AudioContext({ sampleRate: 24000 });
    await playbackCtx.resume();
    playbackCtxRef.current = playbackCtx;
    nextPlayTime.current   = 0;

    const ws = new WebSocket(`${WS_BASE}/live`);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      // 1. Send card context
      ws.send(JSON.stringify({ type: "cards", ids: selectedCardIds }));
      // 2. Send wealth context
      const wealth = getWealthSummary();
      if (wealth) ws.send(JSON.stringify({ type: "wealth", summary: wealth }));
      // 3. Inject prior chat history so the voice session continues naturally
      const history = turnsRef.current.slice(-8);
      if (history.length > 0) {
        const lines = history.map(t => `${t.role === "user" ? "User" : "Advisor"}: ${t.text}`).join("\n");
        ws.send(JSON.stringify({
          type: "context",
          text: `[Prior conversation (continue naturally from here):\n${lines}]`,
        }));
      }
    };

    ws.onmessage = async (evt) => {
      const msg = JSON.parse(evt.data as string);

      if (msg.type === "ready") {
        startMicCapture(ws, captureCtx);
        setLiveState("listening");
      }
      if (msg.type === "audio") {
        if (playbackCtx.state === "suspended") await playbackCtx.resume();
        setLiveState("speaking");
        scheduleAudio(playbackCtx, nextPlayTime, msg.data);
      }
      if (msg.type === "transcript" && msg.text) {
        setStreamingText(p => p + msg.text);
      }
      if (msg.type === "text" && msg.text) {
        setStreamingText(p => p + msg.text);
      }
      if (msg.type === "turn_complete") {
        setLiveState("listening");
        setStreamingText(prev => {
          if (prev.trim()) setTurns(t => [...t, { role: "ai", text: prev.trim() }]);
          return "";
        });
        setAudioLevel(0);
      }
      if (msg.type === "error") {
        setErrorMsg(msg.message || "Connection error");
        setLiveState("error");
        cleanupVoice();
      }
    };

    ws.onerror = () => {
      setErrorMsg("WebSocket failed — is the backend running?");
      setLiveState("error");
      cleanupVoice();
    };

    ws.onclose = () => {
      setLiveState("idle");
      cleanupVoice();
    };
  }

  function stopVoiceSession() {
    cleanupVoice();
    stopCamera();
    setLiveState("idle");
    setStreamingText("");
    setAudioLevel(0);
  }

  function handlePttDown() {
    setPttActive(true);
    pttActiveRef.current = true;
    // Add user placeholder so they see recording started
    setAudioLevel(0);
  }

  function handlePttUp() {
    setPttActive(false);
    pttActiveRef.current = false;
    setAudioLevel(0);
    wsRef.current?.send(JSON.stringify({ type: "audio_end" }));
  }

  async function toggleCamera() {
    if (cameraOn) { stopCamera(); return; }
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      cameraStreamRef.current = cam;
      if (videoRef.current) {
        videoRef.current.srcObject = cam;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch { alert("Camera access denied."); }
  }

  function sendCameraFrame() {
    if (!canvasRef.current || !videoRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;
    const c = canvasRef.current;
    c.width = 640; c.height = 480;
    c.getContext("2d")!.drawImage(videoRef.current, 0, 0, 640, 480);
    const b64 = c.toDataURL("image/jpeg", 0.8).split(",")[1];
    wsRef.current.send(JSON.stringify({ type: "image", data: b64 }));
    setTurns(t => [...t, { role: "user", text: "📷 Shared camera view" }]);
  }

  // When mode switches, stop the voice session
  function switchMode(newMode: Mode) {
    if (newMode === "chat" && (liveState === "listening" || liveState === "speaking")) {
      stopVoiceSession();
    }
    setMode(newMode);
  }

  // ── Send text in either mode ────────────────────────────────────────────────

  function handleSend() {
    const message = textInput.trim();
    if (!message) return;

    if (mode === "voice" && wsRef.current?.readyState === WebSocket.OPEN) {
      // Send via WebSocket (agent will respond with audio)
      wsRef.current.send(JSON.stringify({ type: "text", text: message }));
      setTurns(t => [...t, { role: "user", text: message }]);
      setTextInput("");
    } else {
      // Send via HTTP (text response)
      sendChatMessage(message);
      if (mode === "voice") setTextInput(""); // sendChatMessage handles it for chat mode
    }
  }

  const isVoiceActive = liveState === "listening" || liveState === "speaking";
  const glowAlpha     = isVoiceActive ? 0.35 + audioLevel * 0.45 : 0.15;
  const glowSize      = isVoiceActive ? 30 + audioLevel * 50     : 20;
  const orbGradient   =
    liveState === "speaking"    ? "linear-gradient(135deg,#52d9a0,#3bb87e)"
    : liveState === "error"     ? "linear-gradient(135deg,#ef4444,#991b1b)"
    : liveState === "connecting"? "linear-gradient(135deg,#666,#444)"
    : "linear-gradient(135deg,#c36dbb,#8f8fbf)";

  const hasWealth = !!getWealthSummary();

  return (
    <div className="flex flex-col gap-4" style={{ minHeight: "calc(100vh - 14rem)" }}>

      {/* Header badges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass text-[11px]">
          <div className="w-1.5 h-1.5 rounded-full transition-all duration-300"
            style={{ background: isVoiceActive ? "#52d9a0" : "#333", boxShadow: isVoiceActive ? "0 0 6px #52d9a0" : "none" }} />
          <span style={{ color: isVoiceActive ? "#52d9a0" : "#555" }}>Gemini Live · Multimodal</span>
          <Sparkles size={10} style={{ color: "#c36dbb" }} />
        </div>
        {hasWealth && (
          <span className="text-[10px] px-2 py-1 rounded-full glass" style={{ color: "#52d9a0" }}>
            💰 Wealth data loaded
          </span>
        )}
      </div>

      {/* Mode selector */}
      <div className="flex items-center gap-1 rounded-full p-0.5 glass self-start">
        {([
          { id: "chat",  label: "Chat",  icon: <MessageSquare size={12} /> },
          { id: "voice", label: "Voice", icon: <Radio size={12} /> },
        ] as const).map(({ id, label, icon }) => (
          <button key={id} onClick={() => switchMode(id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={mode === id
              ? { background: "rgba(195,109,187,0.2)", color: "#fff", border: "1px solid rgba(195,109,187,0.3)" }
              : { color: "#555" }}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ── VOICE MODE CONTROLS ── */}
      {mode === "voice" && (
        <div className="flex flex-col items-center gap-3">
          {/* Orb */}
          <button
            onClick={isVoiceActive ? undefined : startVoiceSession}
            disabled={liveState === "connecting"}
            onMouseDown={isVoiceActive && pttMode ? handlePttDown : undefined}
            onMouseUp={isVoiceActive && pttMode ? handlePttUp : undefined}
            onTouchStart={isVoiceActive && pttMode ? (e) => { e.preventDefault(); handlePttDown(); } : undefined}
            onTouchEnd={isVoiceActive && pttMode ? (e) => { e.preventDefault(); handlePttUp(); } : undefined}
            className="w-28 h-28 rounded-full flex items-center justify-center transition-all duration-100"
            style={{
              background: orbGradient,
              boxShadow: `0 0 ${glowSize}px ${glowSize/3}px rgba(195,109,187,${glowAlpha}), 0 0 ${glowSize*2}px ${glowSize/2}px rgba(143,143,191,${glowAlpha*0.4})`,
              transform: `scale(${1 + audioLevel * 0.08})`,
            }}>
            {liveState === "connecting"
              ? <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Radio size={26} className="text-white drop-shadow" />}
          </button>

          {/* Status */}
          <p className="text-sm" style={{ color: liveState === "error" ? "#ef4444" : "#777" }}>
            {liveState === "error"     ? errorMsg
            : liveState === "idle"       ? "Tap orb to connect"
            : liveState === "connecting" ? "Connecting..."
            : liveState === "speaking"   ? "Gemini is speaking..."
            : pttActive                  ? "● Recording — release to send"
            : "Hold orb to speak · or type below"}
          </p>

          {/* PTT hint */}
          {isVoiceActive && (
            <p className="text-[10px]" style={{ color: pttActive ? "#52d9a0" : "#555" }}>
              Push to talk — hold the orb while speaking, release to send
            </p>
          )}

          {/* Mic level */}
          {isVoiceActive && (
            <div className="flex items-end gap-0.5 h-5">
              {Array.from({ length: 16 }).map((_, i) => {
                const active = audioLevel > i / 16;
                return (
                  <div key={i} className="w-1 rounded-full transition-all duration-75"
                    style={{ height: `${5 + i * 0.9}px`, background: active ? (liveState === "speaking" ? "#52d9a0" : "#c36dbb") : "rgba(255,255,255,0.06)" }} />
                );
              })}
            </div>
          )}

          {/* Stop button */}
          {isVoiceActive && (
            <button onClick={stopVoiceSession}
              className="text-xs px-4 py-1.5 rounded-xl glass transition-all"
              style={{ color: "#777", border: "1px solid rgba(255,255,255,0.08)" }}>
              End session
            </button>
          )}

          {/* Camera controls */}
          {isVoiceActive && (
            <div className="flex gap-2">
              <button onClick={toggleCamera}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all glass"
                style={cameraOn
                  ? { background: "rgba(195,109,187,0.1)", border: "1px solid rgba(195,109,187,0.3)", color: "#c36dbb" }
                  : { color: "#666" }}>
                {cameraOn ? <Camera size={13} /> : <CameraOff size={13} />}
                {cameraOn ? "Camera on" : "Share camera"}
              </button>
              {cameraOn && (
                <button onClick={sendCameraFrame}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all"
                  style={{ background: "rgba(82,217,160,0.08)", border: "1px solid rgba(82,217,160,0.25)", color: "#52d9a0" }}>
                  <Camera size={13} /> Send frame
                </button>
              )}
            </div>
          )}

          {/* Camera preview */}
          <div className={`relative rounded-2xl overflow-hidden transition-all ${cameraOn ? "opacity-100" : "opacity-0 h-0 pointer-events-none"}`}
            style={cameraOn ? { border: "1px solid rgba(195,109,187,0.25)" } : {}}>
            <video ref={videoRef} className="w-56 h-40 object-cover" muted playsInline />
            {cameraOn && (
              <button onClick={stopCamera}
                className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.65)" }}>
                <X size={10} className="text-white" />
              </button>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {liveState === "error" && (
            <button onClick={startVoiceSession} className="text-xs px-5 py-2 rounded-xl gradient-bg text-white">
              Retry
            </button>
          )}
        </div>
      )}

      {/* ── CHAT MODE empty state ── */}
      {mode === "chat" && turns.length === 0 && !streamingText && (
        <div className="flex flex-col items-center gap-3 py-6">
          <p className="text-[#333] text-xs">Ask anything about your cards, benefits, or finances</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {[
              "Which card for dining?",
              "Can I afford an iPhone?",
              "What credits am I missing?",
              "Can I afford a vacation?",
            ].map(q => (
              <button key={q}
                onClick={() => sendChatMessage(q)}
                className="text-[10px] text-[#555] px-2.5 py-1 rounded-full hover:text-[#aaa] transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Shared transcript ── */}
      {(turns.length > 0 || streamingText) && (
        <div ref={transcriptRef}
          className="flex-1 space-y-2 overflow-y-auto rounded-2xl p-3"
          style={{ maxHeight: "340px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          {turns.map((t, i) => (
            <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
                style={t.role === "user"
                  ? { background: "linear-gradient(135deg,#c36dbb,#8f8fbf)", color: "#fff" }
                  : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", color: "#ddd" }}>
                {t.text}
              </div>
            </div>
          ))}

          {streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
                style={{ background: "rgba(82,217,160,0.06)", border: "1px solid rgba(82,217,160,0.15)", color: "#ccc" }}>
                {streamingText}
                <span className="inline-block w-0.5 h-3.5 ml-0.5 align-middle animate-pulse" style={{ background: "#52d9a0" }} />
              </div>
            </div>
          )}

          {chatLoading && !streamingText && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#555", animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Text input (both modes) ── */}
      <div className="w-full flex items-center gap-2 px-3 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <input
          value={textInput}
          onChange={e => setTextInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={
            mode === "voice" && isVoiceActive
              ? "Type a question (or hold orb to speak)..."
              : mode === "voice"
              ? "Type to chat, or connect voice above..."
              : "Ask about your cards, benefits, or finances..."
          }
          className="flex-1 bg-transparent py-2.5 text-white text-sm placeholder-[#333] focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!textInput.trim() || chatLoading}
          className="text-[#444] hover:text-[#c36dbb] disabled:opacity-20 transition-colors">
          <Send size={14} />
        </button>
      </div>

      {/* No wealth data hint */}
      {!hasWealth && mode === "chat" && (
        <p className="text-[10px] text-[#2e2e2e] text-center">
          Add assets in the Wealth tab to get affordability advice
        </p>
      )}
    </div>
  );
}
