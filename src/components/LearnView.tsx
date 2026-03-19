import { useState, useCallback, useEffect, useRef } from "react";
import {
  Sparkles, ChevronLeft, ChevronRight, Play, Pause, Square,
  Volume2, VolumeX, Share2, RotateCcw, ZoomIn, ZoomOut, Maximize2, Atom, Loader2, Wand2,
} from "lucide-react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ModelViewer } from "./ModelViewer";
import { useApp } from "@/contexts/AppContext";
import { useTTS } from "@/hooks/useTTS";
import { supabase } from "@/integrations/supabase/client";
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

    loader.load(
      url,
      (gltf) => {
        const parts = new Set<string>();
        gltf.scene.traverse((child) => {
          const mesh = child as { isMesh?: boolean; name?: string };
          if (mesh.isMesh && mesh.name) parts.add(mesh.name);
        });
        resolve([...parts]);
      },
      undefined,
      () => resolve([]),
    );
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
      narration_en: typeof step.narration_en === "string" && step.narration_en.trim()
        ? step.narration_en.trim()
        : `Let's explore ${topicLabel} step by step.`,
      narration_hi: typeof step.narration_hi === "string" && step.narration_hi.trim()
        ? step.narration_hi.trim()
        : `${topicLabel} को चरण-दर-चरण समझते हैं।`,
      label_en: typeof step.label_en === "string" && step.label_en.trim() ? step.label_en.trim() : topicLabel,
      label_hi: typeof step.label_hi === "string" && step.label_hi.trim() ? step.label_hi.trim() : topicLabel,
      camera: step.camera &&
        typeof step.camera.x === "number" &&
        typeof step.camera.y === "number" &&
        typeof step.camera.z === "number"
        ? step.camera
        : { x: 0, y: 0, z: 4 },
    };
  });

  if (steps.length > 0) {
    return {
      title: typeof sim?.title === "string" && sim.title.trim() ? sim.title.trim() : topicLabel,
      steps,
    };
  }

  return {
    title: topicLabel,
    steps: [
      {
        title: `Exploring ${topicLabel}`,
        part: "",
        color: fallbackStepColors[0],
        narration_en: `Let's explore the fascinating world of ${topicLabel}. This is an interactive 3D learning experience.`,
        narration_hi: `आइए ${topicLabel} की आकर्षक दुनिया का पता लगाएं।`,
        label_en: topicLabel,
        label_hi: topicLabel,
        camera: { x: 0, y: 0, z: 4 },
      },
      {
        title: "Key Features",
        part: "",
        color: fallbackStepColors[1],
        narration_en: `${topicLabel} has many interesting features that we'll explore step by step.`,
        narration_hi: `${topicLabel} की कई दिलचस्प विशेषताएं हैं।`,
        label_en: "Features",
        label_hi: "विशेषताएं",
        camera: { x: 2, y: 1, z: 3 },
      },
      {
        title: "Summary",
        part: "",
        color: fallbackStepColors[2],
        narration_en: `That concludes our exploration of ${topicLabel}. Keep learning and exploring!`,
        narration_hi: `${topicLabel} की हमारी खोज यहीं समाप्त होती है। सीखते रहें!`,
        label_en: "Summary",
        label_hi: "सारांश",
        camera: { x: 0, y: 0, z: 4 },
      },
    ],
  };
};

export function LearnView() {
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
  const { language, setLanguage } = useApp();
  const { speak, stop: stopTTS, isSpeaking } = useTTS();
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = simulation?.steps[currentStep];
  const resolvedHighlightPart = step ? resolvePartName(step.part, modelParts) || undefined : undefined;

  // Auto-play logic
  useEffect(() => {
    if (!isAutoPlaying || !simulation) return;

    if (!isMuted && step) {
      const text = language === "en" ? step.narration_en : step.narration_hi;
      speak(text, language);
    }

    autoPlayRef.current = setTimeout(() => {
      if (currentStep < simulation.steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        setIsAutoPlaying(false);
      }
    }, 8000);

    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
    };
  }, [isAutoPlaying, currentStep, simulation, isMuted, language, step, speak]);

  const handlePlayNarration = () => {
    if (isSpeaking) {
      stopTTS();
      return;
    }
    if (step) {
      const text = language === "en" ? step.narration_en : step.narration_hi;
      speak(text, language);
    }
  };

  const handleAutoPlay = () => {
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      stopTTS();
    } else {
      setIsAutoPlaying(true);
    }
  };

  const handleGenerate = async (topic?: string) => {
    const t = topic || topicInput;
    if (!t.trim()) return;

    setTopicInput(t);
    setIsLoading(true);
    setSimulation(null);
    setModelParts([]);
    setLoadingProgress(10);
    setLoadingMsg("Searching for 3D models...");

    const slug = t.toLowerCase().replace(/\s+/g, "_");
    const { data: model } = await supabase
      .from("models")
      .select("*")
      .or(`slug.eq.${slug},keywords_en.cs.{${t.toLowerCase()}}`)
      .eq("status", "published")
      .order("viral_score", { ascending: false })
      .limit(1)
      .maybeSingle();

    setLoadingProgress(30);

    if (model?.file_url) {
      setModelUrl(model.file_url);
      setLoadingMsg("Model found! Preparing AI simulation...");
    } else {
      setModelUrl(null);
      setLoadingMsg("No model found. Generating AI simulation...");
    }

    let effectiveNamedParts: string[] = model?.named_parts?.length ? model.named_parts : [];

    if (!effectiveNamedParts.length && model?.file_url?.toLowerCase().endsWith(".glb")) {
      setLoadingProgress(45);
      setLoadingMsg("Analyzing model parts for accurate highlights...");
      const extracted = await extractModelPartsFromGlb(model.file_url);
      if (extracted.length > 0) {
        effectiveNamedParts = extracted;
        setModelParts(extracted);
      }
    }

    setLoadingProgress(55);

    if (model?.id) {
      const { data: cached } = await supabase
        .from("simulation_cache")
        .select("*")
        .eq("model_id", model.id)
        .eq("language", "en")
        .maybeSingle();

      if (cached?.ai_response) {
        const rawCached = cached.ai_response as { steps?: Array<{ part?: string }> };
        const cacheHasUnresolvedParts = effectiveNamedParts.length > 0 &&
          Array.isArray(rawCached.steps) &&
          rawCached.steps.some((cachedStep) => {
            const part = typeof cachedStep?.part === "string" ? cachedStep.part : "";
            return part.trim().length > 0 && !resolvePartName(part, effectiveNamedParts);
          });

        if (!cacheHasUnresolvedParts) {
          setLoadingProgress(90);
          setLoadingMsg("Loading cached simulation...");
          const normalizedCache = normalizeSimulationData(cached.ai_response, effectiveNamedParts, t);
          setSimulation(normalizedCache);
          setCurrentStep(0);
          setLoadingProgress(100);
          await supabase
            .from("simulation_cache")
            .update({ serve_count: (cached.serve_count || 0) + 1 })
            .eq("id", cached.id);
          setTimeout(() => setIsLoading(false), 300);
          return;
        }
      }
    }

    setLoadingMsg("AI is creating your simulation...");
    setLoadingProgress(65);

    try {
      const { data, error } = await supabase.functions.invoke("enhance-model", {
        body: {
          modelName: t,
          subject: model?.subject || "science",
          namedParts: effectiveNamedParts,
          language: "en",
        },
      });

      if (error) throw error;

      setLoadingProgress(85);
      setLoadingMsg("Finalizing experience...");

      if (data && data.steps) {
        const normalized = normalizeSimulationData(data, effectiveNamedParts, t);
        setSimulation(normalized);
        setCurrentStep(0);

        if (model?.id) {
          await supabase.from("simulation_cache").upsert({
            model_id: model.id,
            language: "en",
            ai_response: normalized,
          }, { onConflict: "model_id,language" });
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
    if (next >= 0 && next < simulation.steps.length) {
      setCurrentStep(next);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Canvas Area */}
      <div className="flex-1 flex flex-col p-4 md:p-5 gap-3 min-w-0">
        {/* Topic input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Sparkles size={16} strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-accent" />
            <input
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="Enter any topic to explore in 3D..."
              className="w-full bg-card border border-border rounded-xl h-11 pl-10 pr-4 text-[14px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            onClick={() => handleGenerate()}
            disabled={isLoading || !topicInput.trim()}
            className="bg-primary text-primary-foreground px-5 rounded-xl text-[13px] font-medium hover:opacity-90 transition-opacity active:scale-[0.97] disabled:opacity-40 flex items-center gap-2"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            Generate
          </button>
        </div>

        {/* Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {topicSuggestions.map((t) => (
            <button
              key={t}
              onClick={() => handleGenerate(t)}
              disabled={isLoading}
              className="shrink-0 px-3 py-1.5 bg-card border border-border rounded-lg text-[12px] text-secondary-custom hover:border-accent hover:text-accent transition-all duration-150 disabled:opacity-40"
            >
              {t}
            </button>
          ))}
        </div>

        {/* 3D Canvas */}
        <div className="flex-1 bg-canvas rounded-2xl border border-subtle overflow-hidden relative min-h-[280px] shadow-sm">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 px-8">
              <div className="w-full max-w-xs">
                <Progress value={loadingProgress} className="h-1.5" />
              </div>
              <Atom size={40} strokeWidth={1} className="text-accent animate-spin" style={{ animationDuration: "3s" }} />
              <div className="text-center">
                <p className="text-[14px] text-primary-custom font-medium">{loadingMsg}</p>
                <p className="text-[12px] text-tertiary-custom mt-1">{topicInput}</p>
              </div>
            </div>
          ) : simulation ? (
            <>
              <ModelViewer
                modelUrl={modelUrl}
                highlightPart={resolvedHighlightPart}
                highlightColor={step?.color}
                onPartsLoaded={onPartsLoaded}
              />
              {/* Part label overlay */}
              {step && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm border border-border px-4 py-2 rounded-xl shadow-sm animate-fade-in" key={currentStep}>
                  <p className="text-[13px] font-medium text-primary-custom">
                    {language === "en" ? step.label_en : step.label_hi}
                  </p>
                </div>
              )}
              {/* Canvas controls */}
              <div className="absolute top-3 right-3 flex flex-col gap-0.5 bg-card/90 backdrop-blur-sm border border-border rounded-xl p-1">
                {[RotateCcw, ZoomIn, ZoomOut, Maximize2].map((Icon, i) => (
                  <button key={i} className="p-1.5 hover:bg-background-secondary rounded-lg transition-colors">
                    <Icon size={14} strokeWidth={1.5} className="text-secondary-custom" />
                  </button>
                ))}
              </div>
              {/* Step indicator */}
              <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-2.5 py-1">
                <span className="text-[11px] font-medium text-secondary-custom">
                  Step {currentStep + 1}/{simulation.steps.length}
                </span>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <ModelViewer modelUrl={null} />
            </div>
          )}
        </div>
      </div>

      {/* Step Panel */}
      {simulation && !isLoading && (
        <div className="md:w-[360px] lg:w-[380px] bg-card border-t md:border-t-0 md:border-l border-subtle flex flex-col shrink-0">
          <div className="p-5 pb-0">
            <h2 className="text-[18px] font-semibold text-primary-custom">{simulation.title || topicInput}</h2>
            <p className="text-[12px] text-tertiary-custom mt-1">
              AI-Generated · {simulation.steps.length} Steps
              {isAutoPlaying && <span className="text-accent ml-1">● Auto-playing</span>}
            </p>
          </div>

          {/* Step nav */}
          <div className="px-5 pt-4 flex items-center justify-between">
            <span className="label-text text-tertiary-custom">Step {currentStep + 1} of {simulation.steps.length}</span>
            <div className="flex gap-1">
              <button
                onClick={() => goStep(-1)}
                disabled={currentStep === 0}
                className="p-1.5 border border-border rounded-lg disabled:opacity-20 hover:bg-background-secondary transition-colors"
              >
                <ChevronLeft size={14} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => goStep(1)}
                disabled={currentStep === simulation.steps.length - 1}
                className="p-1.5 border border-border rounded-lg disabled:opacity-20 hover:bg-background-secondary transition-colors"
              >
                <ChevronRight size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 py-4 px-5">
            {simulation.steps.map((s, i) => (
              <button
                key={i}
                onClick={() => { stopTTS(); setCurrentStep(i); }}
                className="h-2 rounded-full transition-all"
                style={{
                  width: i === currentStep ? 20 : 8,
                  backgroundColor: i === currentStep ? "hsl(var(--accent))" : i < currentStep ? "hsl(var(--accent) / 0.4)" : "hsl(var(--border))",
                  transition: "width 250ms ease-in-out, background-color 150ms",
                }}
              />
            ))}
          </div>

          {/* Step content */}
          {step && (
            <div className="flex-1 overflow-y-auto px-5 animate-fade-in" key={currentStep}>
              <div className="flex items-center gap-2 mb-2">
                {step.color && (
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: step.color }} />
                )}
                <h3 className="text-[16px] font-semibold text-primary-custom">{step.title}</h3>
              </div>
              <p className="text-[14px] text-secondary-custom leading-relaxed">
                {language === "en" ? step.narration_en : step.narration_hi}
              </p>
              {/* Speaking indicator */}
              <div className="flex items-center gap-2 mt-4">
                <div className="flex items-end gap-[2px]">
                  {[10, 16, 7, 12].map((h, i) => (
                    <div
                      key={i}
                      className="w-[2.5px] bg-accent rounded-full transition-all"
                      style={{ height: isSpeaking ? h : 3, transitionDuration: "300ms", transitionDelay: `${i * 80}ms` }}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-tertiary-custom">
                  {isSpeaking
                    ? (language === "en" ? "Speaking in English" : "हिंदी में बोल रहा है")
                    : "Tap play to listen"}
                </span>
              </div>
            </div>
          )}

          {/* Playback controls */}
          <div className="p-4 border-t border-subtle flex items-center justify-between">
            <div className="flex rounded-full overflow-hidden border border-border h-7">
              {(["en", "hi"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => { stopTTS(); setLanguage(l); }}
                  className={`px-2.5 text-[11px] font-medium transition-colors ${
                    language === l ? "bg-accent text-accent-foreground" : "text-secondary-custom hover:bg-background-secondary"
                  }`}
                >
                  {l === "en" ? "EN" : "हिं"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayNarration}
                className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center hover:bg-background-secondary transition-colors"
                title={isSpeaking ? "Stop narration" : "Play narration"}
              >
                {isSpeaking ? <Square size={12} className="text-accent" /> : <Volume2 size={14} className="text-secondary-custom" />}
              </button>
              <button
                onClick={handleAutoPlay}
                className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:opacity-90 transition-opacity active:scale-[0.97]"
                title={isAutoPlaying ? "Stop auto-play" : "Auto-play all steps"}
              >
                {isAutoPlaying ? <Pause size={16} className="text-primary-foreground" /> : <Play size={16} className="text-primary-foreground ml-0.5" />}
              </button>
            </div>

            <div className="flex gap-2.5">
              <button onClick={() => setIsMuted(!isMuted)}>
                {isMuted
                  ? <VolumeX size={16} strokeWidth={1.5} className="text-tertiary-custom hover:text-secondary-custom transition-colors" />
                  : <Volume2 size={16} strokeWidth={1.5} className="text-tertiary-custom hover:text-secondary-custom transition-colors" />}
              </button>
              <Share2 size={16} strokeWidth={1.5} className="text-tertiary-custom cursor-pointer hover:text-secondary-custom transition-colors" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
