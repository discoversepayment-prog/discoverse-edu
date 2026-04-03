import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef(false);

  const stop = useCallback(() => {
    abortRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string, _language: "en" | "hi" = "en") => {
    stop();
    abortRef.current = false;

    const cleaned = text
      .replace(/[#*_~`]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\n+/g, " ")
      .trim();

    if (!cleaned) return;

    // Try ElevenLabs first
    try {
      setIsSpeaking(true);

      // Use a multilingual voice - Rachel for English, same for Hindi (eleven_multilingual_v2 supports Hindi)
      const voiceId = "EXAVITQu4vr4xnSDxMaL"; // Sarah - warm, clear, multilingual

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: cleaned, voiceId }),
        }
      );

      if (abortRef.current) return;

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      if (abortRef.current) return;

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      console.warn("ElevenLabs TTS failed, falling back to browser TTS:", err);
      if (abortRef.current) { setIsSpeaking(false); return; }

      // Fallback to browser SpeechSynthesis
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = _language === "hi" ? "hi-IN" : "en-US";
      utterance.rate = 0.92;
      utterance.pitch = 1.0;

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        if (e.error !== "canceled") console.warn("Browser TTS error:", e.error);
        setIsSpeaking(false);
      };

      setIsSpeaking(true);
      speechSynthesis.speak(utterance);
    }
  }, [stop]);

  return { speak, stop, isSpeaking };
}
