import { useState, useRef, useCallback } from "react";

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string, _language: "en" | "hi" = "en") => {
    stop();

    const cleaned = text
      .replace(/[#*_~`]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\n+/g, " ")
      .trim();

    if (!cleaned) return;

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = _language === "hi" ? "hi-IN" : "en-US";
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utteranceRef.current = utterance;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      utteranceRef.current = null;
    };
    utterance.onerror = (e) => {
      if (e.error !== "canceled") {
        console.warn("TTS error:", e.error);
      }
      setIsSpeaking(false);
      utteranceRef.current = null;
    };

    setIsSpeaking(true);
    speechSynthesis.speak(utterance);
  }, [stop]);

  return { speak, stop, isSpeaking };
}
