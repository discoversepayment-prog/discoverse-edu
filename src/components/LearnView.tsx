import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sparkles, ChevronLeft, ChevronRight, Play, Pause, Square,
  Volume2, VolumeX, Share2, RotateCcw, Atom, Loader2, Wand2,
  Eye,
} from "lucide-react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ModelViewer } from "./ModelViewer";
import { useApp } from "@/contexts/AppContext";
import { useTTS } from "@/hooks/useTTS";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Progress } from "@/components/ui/progress";

interface SimStep {
  title: string;
  part: string;
  color: string;
  narration_en: string;
  narration_hi: string;
  label_en: string;
  label_hi: string;
  camera?: { x: number; y: number; z: number };
}

interface Simulation {
  title: string;
  steps: SimStep[];
}

const topicSuggestions = ["Human Heart", "DNA Structure", "Solar System", "Atom Model", "Cell Division", "Water Molecule"];
const fallbackStepColors = ["#CC4444", "#4488CC", "#44AA44", "#D17A00", "#7D4CC2", "#D14A8B"];

const isHexColor = (color: unknown): color is string => typeof color === "string" && /^#([0-9a-fA-F]{6})$/.test(color);
const normalizeToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const resolvePartName = (candidate: string, availableParts: string[]) => {
  const trimmed = candidate.trim();
  if (!trimmed || availableParts.length === 0) return "";
  if (availableParts.includes(trimmed)) return trimmed;
  const normalizedCandidate = normalizeToken(trimmed);
  const exact = availableParts.find((part) => normalizeToken(part) === normalizedCandidate);
  if (exact) return exact;
  const partial = availableParts.find((part) => {
    const normalizedPart = normalizeToken(part);
    return normalizedPart.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedPart);
  });
  return partial || "";
};

const extractModelPartsFromGlb = async (url: string): Promise<string[]> => {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      const parts = new Set<string>();
      gltf.scene.traverse((child) => {
        const mesh = child as { isMesh?: boolean; name?: string };
        if (mesh.isMesh && mesh.name) parts.add(mesh.name);
      });
      resolve([...parts]);
    }, undefined, () => resolve([]));
  });
};

const normalizeSimulationData = (rawSimulation: unknown, availableParts: string[], topicLabel: string): Simulation => {
  const sim = rawSimulation as Partial<Simulation> | null;
  const rawSteps = Array.isArray(sim?.steps) ? sim.steps : [];

  const steps: SimStep[] = rawSteps.slice(0, 8).map((rawStep, index) => {
    const step = rawStep as Partial<SimStep>;
    const rawPart = typeof step.part === "string" ? step.part.trim() : "";
    return {
      title: typeof step.title === "string" && step.title.trim() ? step.title.trim() : `Step ${index + 1}`,
      part: availableParts.length > 0 ? resolvePartName(rawPart, availableParts) : rawPart,
      color: isHexColor(step.color) ? step.color : fallbackStepColors[index % fallbackStepColors.length],
      narration_en: typeof step.narration_en === "string" && step.narration_en.trim() ? step.narration_en.trim() : `Let's explore ${topicLabel}.`,
      narration_hi: typeof step.narration_hi === "string" && step.narration_hi.trim() ? step.narration_hi.trim() : `${topicLabel} ko samjhte hain.`,
      label_en: typeof step.label_en === "string" && step.label_en.trim() ? step.label_en.trim() : topicLabel,
      label_hi: typeof step.label_hi === "string" && step.label_hi.trim() ? step.label_hi.trim() : topicLabel,
      camera: step.camera && typeof step.camera.x === "number" && typeof step.camera.y === "number" && typeof step.camera.z === "number"
        ? step.camera : { x: 0, y: 0, z: 4 },
    };
  });

  if (steps.length > 0) {
    return { title: typeof sim?.title === "string" && sim.title.trim() ? sim.title.trim() : topicLabel, steps };
  }

  return {
    title: topicLabel,
    steps: [
      { title: topicLabel, part: "", color: fallbackStepColors[0], narration_en: `This is ${topicLabel}. Tap play to hear each part explained.`, narration_hi: `Yo ${topicLabel} ho. Sunna play garnus.`, label_en: topicLabel, label_hi: topicLabel, camera: { x: 0, y: 0, z: 4 } },
      { title: "Key Parts", part: "", color: fallbackStepColors[1], narration_en: `${topicLabel} has several key components.`, narration_hi: `${topicLabel} ma kehi important bhag chan.`, label_en: "Parts", label_hi: "भाग", camera: { x: 2, y: 1, z: 3 } },
      { title: "Summary", part: "", color: fallbackStepColors[2], narration_en: `That's ${topicLabel}. Quick and clear.`, narration_hi: `Yo thiyo ${topicLabel}. Simple ra clear.`, label_en: "Summary", label_hi: "सारांश", camera: { x: 0, y: 0, z: 4 } },
    ],
  };
};

/* ── Premium loading messages ── */
const LOADING_MESSAGES = [
  "🔬 Scanning knowledge base...",
  "🧠 AI is thinking deeply...",
  "⚡ Generating simulation steps...",
  "🎨 Preparing 3D visualization...",
  "✨ Almost ready, finalizing...",
];

export function LearnView() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [topicInput, setTopicInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelParts, setModelParts] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const { language, setLanguage } = useApp();
  const { speak, stop: stopTTS, isSpeaking } = useTTS();
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingMsgRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = simulation?.steps[currentStep];
  const resolvedHighlightPart = step ? resolvePartName(step.part, modelParts) || undefined : undefined;

  // Animated loading messages
  useEffect(() => {
    if (isLoading) {
      let idx = 0;
      loadingMsgRef.current = setInterval(() => {
        idx = (idx + 1) % LOADING_MESSAGES.length;
        setLoadingMsg(LOADING_MESSAGES[idx]);
      }, 2500);
      return () => { if (loadingMsgRef.current) clearInterval(loadingMsgRef.current); };
    }
  }, [isLoading]);

  // Auto-play logic
  useEffect(() => {
    if (!isAutoPlaying || !simulation) return;
    
    if (!isMuted && step) {
      const text = language === "en" ? step.narration_en : step.narration_hi;
      speak(text, language);
    }
    
    if (isSpeaking) return;
    
    autoPlayRef.current = setTimeout(() => {
      if (currentStep < simulation.steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        setIsAutoPlaying(false);
      }
    }, isMuted ? 5000 : 2000);
    
    return () => { if (autoPlayRef.current) clearTimeout(autoPlayRef.current); };
  }, [isAutoPlaying, currentStep, simulation, isMuted, language, step, speak, isSpeaking]);

  const handlePlayNarration = () => {
    if (isSpeaking) { stopTTS(); return; }
    if (step) {
      const text = language === "en" ? step.narration_en : step.narration_hi;
      speak(text, language);
    }
  };

  const handleAutoPlay = () => {
    if (isAutoPlaying) { setIsAutoPlaying(false); stopTTS(); } else { setIsAutoPlaying(true); }
  };

  const handleGenerate = async (topic?: string) => {
    const t = topic || topicInput;
    if (!t.trim()) return;
    setTopicInput(t);
    setIsLoading(true);
    setSimulation(null);
    setModelParts([]);
    setLoadingProgress(10);
    setLoadingMsg(LOADING_MESSAGES[0]);
    setShowPanel(true);

    // Fuzzy search: try exact slug, then keywords, then ilike on name/subject
    const slug = t.toLowerCase().replace(/\s+/g, "_");
    const searchTerm = t.toLowerCase().trim();
    const words = searchTerm.split(/\s+/).filter(Boolean);

    let model: any = null;

    // 1. Exact slug match
    const { data: exactMatch } = await supabase
      .from("models").select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .limit(1).maybeSingle();

    if (exactMatch) {
      model = exactMatch;
    } else {
      // 2. Keywords match
      const { data: keywordMatch } = await supabase
        .from("models").select("*")
        .eq("status", "published")
        .or(`keywords_en.cs.{${searchTerm}},keywords_hi.cs.{${searchTerm}},keywords_ne.cs.{${searchTerm}}`)
        .order("viral_score", { ascending: false })
        .limit(1).maybeSingle();

      if (keywordMatch) {
        model = keywordMatch;
      } else {
        // 3. Fuzzy name/subject search with ilike on each word
        for (const word of words) {
          if (word.length < 2) continue;
          const pattern = `%${word}%`;
          const { data: fuzzyMatch } = await supabase
            .from("models").select("*")
            .eq("status", "published")
            .or(`name.ilike.${pattern},subject.ilike.${pattern},slug.ilike.${pattern}`)
            .order("viral_score", { ascending: false })
            .limit(1).maybeSingle();
          if (fuzzyMatch) { model = fuzzyMatch; break; }
        }
      }
    }

    setLoadingProgress(30);
    if (model?.file_url) { setModelUrl(model.file_url); }
    else { setModelUrl(null); }

    let effectiveNamedParts: string[] = model?.named_parts?.length ? model.named_parts : [];
    if (!effectiveNamedParts.length && model?.file_url?.toLowerCase().endsWith(".glb")) {
      setLoadingProgress(45);
      const extracted = await extractModelPartsFromGlb(model.file_url);
      if (extracted.length > 0) { effectiveNamedParts = extracted; setModelParts(extracted); }
    }
    setLoadingProgress(55);

    if (model?.id) {
      const { data: cached } = await supabase.from("simulation_cache").select("*").eq("model_id", model.id).eq("language", "en").maybeSingle();
      if (cached?.ai_response) {
        const rawCached = cached.ai_response as { steps?: Array<{ part?: string }> };
        const cacheHasUnresolvedParts = effectiveNamedParts.length > 0 &&
          Array.isArray(rawCached.steps) &&
          rawCached.steps.some((s) => { const p = typeof s?.part === "string" ? s.part : ""; return p.trim().length > 0 && !resolvePartName(p, effectiveNamedParts); });
        if (!cacheHasUnresolvedParts) {
          setLoadingProgress(90);
          setSimulation(normalizeSimulationData(cached.ai_response, effectiveNamedParts, t));
          setCurrentStep(0);
          setLoadingProgress(100);
          await supabase.from("simulation_cache").update({ serve_count: (cached.serve_count || 0) + 1 }).eq("id", cached.id);
          // Auto-save to library
          if (user && model?.id) {
            supabase.from("user_library").upsert({ user_id: user.id, model_id: model.id, last_step: 0 }, { onConflict: "user_id,model_id" }).then(() => {});
          }
          setTimeout(() => setIsLoading(false), 300);
          return;
        }
      }
    }

    setLoadingProgress(65);
    try {
      const { data, error } = await supabase.functions.invoke("enhance-model", {
        body: { modelName: t, subject: model?.subject || "science", namedParts: effectiveNamedParts, language: "en" },
      });
      if (error) throw error;
      setLoadingProgress(85);
      if (data && data.steps) {
        const normalized = normalizeSimulationData(data, effectiveNamedParts, t);
        setSimulation(normalized);
        setCurrentStep(0);
        // Auto-save to library
        if (user && model?.id) {
          supabase.from("user_library").upsert({ user_id: user.id, model_id: model.id, last_step: 0 }, { onConflict: "user_id,model_id" }).then(() => {});
        }
        if (model?.id) {
          const { data: existingCache } = await supabase.from("simulation_cache").select("id").eq("model_id", model.id).eq("language", "en").maybeSingle();
          const normalizedJson = normalized as unknown as Json;
          if (existingCache?.id) { await supabase.from("simulation_cache").update({ ai_response: normalizedJson, updated_at: new Date().toISOString() }).eq("id", existingCache.id); }
          else { await supabase.from("simulation_cache").insert([{ model_id: model.id, language: "en", ai_response: normalizedJson }]); }
        }
      }
    } catch (err) {
      console.error("AI enhancement failed:", err);
      setSimulation(normalizeSimulationData(null, effectiveNamedParts, t));
      setCurrentStep(0);
    }
    setLoadingProgress(100);
    setTimeout(() => setIsLoading(false), 400);
  };

  const onPartsLoaded = useCallback((parts: string[]) => {
    setModelParts(parts);
    setSimulation((prev) => (prev ? normalizeSimulationData(prev, parts, prev.title || topicInput || "Simulation") : prev));
  }, [topicInput]);

  const goStep = (dir: number) => {
    if (!simulation) return;
    stopTTS();
    const next = currentStep + dir;
    if (next >= 0 && next < simulation.steps.length) setCurrentStep(next);
  };

  // ── MOBILE-FIRST UI ──
  return (
    <div className="flex flex-col h-full relative">
      {/* Search bar */}
      <div className="px-3 pt-3 pb-2 flex gap-2 shrink-0">
        <div className="flex-1 relative">
          <Sparkles size={12} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary-custom" />
          <input
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            placeholder="Search any topic..."
            className="w-full bg-card border border-border rounded-lg h-9 pl-9 pr-3 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary/30 transition-colors"
          />
        </div>
        <button
          onClick={() => handleGenerate()}
          disabled={isLoading || !topicInput.trim()}
          className="bg-primary text-primary-foreground px-4 rounded-lg text-[11px] font-bold hover:bg-primary/90 transition-all active:scale-[0.97] disabled:opacity-40 flex items-center gap-1.5 shrink-0"
        >
          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
          <span className="hidden sm:inline">Generate</span>
        </button>
      </div>

      {/* Topic chips */}
      <div className="px-3 flex gap-1.5 overflow-x-auto pb-2 scrollbar-none shrink-0">
        {topicSuggestions.map((t) => (
          <button
            key={t}
            onClick={() => handleGenerate(t)}
            disabled={isLoading}
            className="shrink-0 px-3 py-1 bg-card border border-border rounded-md text-[10px] text-tertiary-custom hover:border-primary/20 hover:text-primary-custom transition-all disabled:opacity-40 active:scale-[0.97] font-medium"
          >
            {t}
          </button>
        ))}
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 mx-3 mb-1 bg-canvas rounded-xl border border-border overflow-hidden relative min-h-0">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 px-6">
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
                <Atom size={28} strokeWidth={1} className="text-primary-custom" style={{ animation: "spin 3s linear infinite" }} />
              </div>
              <div className="absolute -inset-3 rounded-xl border border-border" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
            </div>
            <div className="w-full max-w-[180px]">
              <Progress value={loadingProgress} className="h-1" />
            </div>
            <p className="text-[11px] text-primary-custom font-medium text-center animate-fade-in">{loadingMsg}</p>
            <p className="text-[9px] text-tertiary-custom uppercase tracking-widest">5-10 seconds</p>
          </div>
        ) : simulation ? (
          <>
            <ModelViewer modelUrl={modelUrl} highlightPart={resolvedHighlightPart} highlightColor={step?.color} onPartsLoaded={onPartsLoaded} />

            {/* Step indicator */}
            <div className="absolute top-2.5 left-2.5 bg-card/90 backdrop-blur-sm border border-border rounded-md px-2 py-1 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: step?.color || "hsl(var(--primary))" }} />
              <span className="text-[10px] font-bold text-primary-custom font-mono">
                {currentStep + 1}/{simulation.steps.length}
              </span>
            </div>

            {/* Part label */}
            {step && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm border border-border px-3 py-1 rounded-md animate-fade-in" key={currentStep}>
                <p className="text-[10px] font-bold text-primary-custom flex items-center gap-1.5 uppercase tracking-wider">
                  <Eye size={10} className="text-tertiary-custom" />
                  {language === "en" ? step.label_en : step.label_hi}
                </p>
              </div>
            )}

            {/* Canvas controls */}
            <div className="absolute top-2.5 right-2.5 flex gap-1">
              <button className="w-7 h-7 bg-card/90 backdrop-blur-sm border border-border rounded-md flex items-center justify-center active:scale-[0.95]">
                <RotateCcw size={11} strokeWidth={1.5} className="text-tertiary-custom" />
              </button>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <ModelViewer modelUrl={null} />
          </div>
        )}
      </div>

      {/* Bottom Panel - fixed above mobile nav with proper spacing */}
      {simulation && !isLoading && (
        <div className={`bg-card border-t border-subtle rounded-t-2xl transition-all duration-300 ${showPanel ? "max-h-[40vh]" : "max-h-[100px]"} flex flex-col shrink-0 overflow-hidden mb-14 md:mb-0`}>
          {/* Panel handle */}
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="w-full flex items-center justify-center py-1.5 shrink-0 active:bg-background-secondary"
          >
            <div className="w-8 h-1 bg-border rounded-full" />
          </button>

          {/* Step progress bar */}
          <div className="px-3 pb-1.5 flex gap-1 shrink-0">
            {simulation.steps.map((s, i) => (
              <button
                key={i}
                onClick={() => { stopTTS(); setCurrentStep(i); }}
                className="flex-1 h-1.5 rounded-full transition-all duration-200 active:scale-y-150"
                style={{
                  backgroundColor: i === currentStep
                    ? (s.color || "hsl(var(--accent))")
                    : i < currentStep
                      ? "hsl(var(--accent) / 0.3)"
                      : "hsl(var(--border))",
                }}
              />
            ))}
          </div>

          {/* Step title + narration */}
          {step && showPanel && (
            <div className="px-4 flex-1 overflow-y-auto animate-fade-in" key={currentStep}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: step.color }} />
                <h3 className="text-[15px] font-semibold text-primary-custom">{step.title}</h3>
              </div>
              <p className="text-[13px] text-secondary-custom leading-relaxed pl-[18px]">
                {language === "en" ? step.narration_en : step.narration_hi}
              </p>

              {/* Audio indicator */}
              <div className="flex items-center gap-2 mt-2 pl-[18px]">
                <div className="flex items-end gap-[2px]">
                  {[8, 14, 6, 10].map((h, i) => (
                    <div
                      key={i}
                      className="w-[2px] bg-accent rounded-full transition-all"
                      style={{ height: isSpeaking ? h : 2, transitionDuration: "300ms", transitionDelay: `${i * 80}ms` }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-tertiary-custom">
                  {isSpeaking ? "🔊 Speaking..." : "Tap ▶ to listen"}
                </span>
              </div>
            </div>
          )}

          {/* Controls bar - always visible */}
          <div className="px-3 py-2 flex items-center justify-between shrink-0 border-t border-subtle">
            {/* Language toggle */}
            <div className="flex rounded-full overflow-hidden border border-border h-7">
              {(["en", "hi"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => { stopTTS(); setLanguage(l); }}
                  className={`px-2.5 text-[10px] font-medium transition-colors active:scale-[0.95] ${
                    language === l ? "bg-accent text-accent-foreground" : "text-secondary-custom hover:bg-background-secondary"
                  }`}
                >
                  {l === "en" ? "EN" : "ने"}
                </button>
              ))}
            </div>

            {/* Playback */}
            <div className="flex items-center gap-1.5">
              <button onClick={() => goStep(-1)} disabled={currentStep === 0} className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-20 active:scale-[0.95]">
                <ChevronLeft size={14} strokeWidth={1.5} className="text-secondary-custom" />
              </button>

              <button
                onClick={handlePlayNarration}
                className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center active:scale-[0.95]"
              >
                {isSpeaking ? <Square size={10} className="text-accent" /> : <Volume2 size={13} className="text-secondary-custom" />}
              </button>

              <button
                onClick={handleAutoPlay}
                className="w-10 h-10 rounded-full bg-accent flex items-center justify-center hover:opacity-90 active:scale-[0.95] transition-all shadow-md"
              >
                {isAutoPlaying ? <Pause size={14} className="text-accent-foreground" /> : <Play size={14} className="text-accent-foreground ml-0.5" />}
              </button>

              <button onClick={() => goStep(1)} disabled={currentStep === (simulation?.steps.length ?? 0) - 1} className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-20 active:scale-[0.95]">
                <ChevronRight size={14} strokeWidth={1.5} className="text-secondary-custom" />
              </button>

              <button onClick={() => setIsMuted(!isMuted)} className="w-8 h-8 rounded-full border border-border flex items-center justify-center active:scale-[0.95]">
                {isMuted ? <VolumeX size={13} className="text-tertiary-custom" /> : <Volume2 size={13} className="text-tertiary-custom" />}
              </button>
            </div>

            {/* Share */}
            <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center active:scale-[0.95]">
              <Share2 size={13} className="text-tertiary-custom" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
