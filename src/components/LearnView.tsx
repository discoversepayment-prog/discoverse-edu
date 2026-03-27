import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import {
  Sparkles, ChevronLeft, ChevronRight, Play, Pause, Square,
  Volume2, VolumeX, Share2, RotateCcw, Atom, Loader2, Wand2,
  Eye, Crown, Box,
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
      narration_hi: typeof step.narration_hi === "string" && step.narration_hi.trim() ? step.narration_hi.trim() : `${topicLabel} को समझते हैं।`,
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
      { title: topicLabel, part: "", color: fallbackStepColors[0], narration_en: `This is ${topicLabel}. Tap play to hear each part explained.`, narration_hi: `यह ${topicLabel} है। सुनने के लिए प्ले दबाएं।`, label_en: topicLabel, label_hi: topicLabel, camera: { x: 0, y: 0, z: 4 } },
      { title: "Key Parts", part: "", color: fallbackStepColors[1], narration_en: `${topicLabel} has several key components.`, narration_hi: `${topicLabel} में कई महत्वपूर्ण भाग हैं।`, label_en: "Parts", label_hi: "भाग", camera: { x: 2, y: 1, z: 3 } },
      { title: "Summary", part: "", color: fallbackStepColors[2], narration_en: `That's ${topicLabel}. Quick and clear.`, narration_hi: `यह था ${topicLabel}। सरल और स्पष्ट।`, label_en: "Summary", label_hi: "सारांश", camera: { x: 0, y: 0, z: 4 } },
    ],
  };
};

const MESHY_LOADING_MESSAGES = [
  "🧊 Creating 3D preview mesh...",
  "🎨 AI is sculpting your model...",
  "✨ Generating geometry...",
  "🔧 Refining with HD textures...",
  "🎭 Applying materials & details...",
  "📦 Packaging your 3D model...",
  "🚀 Almost there, finalizing...",
];

const MAX_FREE_GENERATIONS = 3;
const POLL_INTERVAL = 4000;

export function LearnView() {
  const { user } = useAuth();
  const location = useLocation();
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
  const [todayCount, setTodayCount] = useState(0);
  const [meshyStage, setMeshyStage] = useState<string>("");
  const { language, setLanguage } = useApp();
  const { speak, stop: stopTTS, isSpeaking } = useTTS();
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingMsgRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeHandled = useRef(false);
  const abortRef = useRef(false);

  const step = simulation?.steps[currentStep];
  const resolvedHighlightPart = step ? resolvePartName(step.part, modelParts) || undefined : undefined;
  const remaining = Math.max(0, MAX_FREE_GENERATIONS - todayCount);

  // Check for resume state from Library
  useEffect(() => {
    const state = location.state as { resumeTopic?: string; resumeStep?: number } | null;
    if (state?.resumeTopic && !resumeHandled.current) {
      resumeHandled.current = true;
      setTopicInput(state.resumeTopic);
      handleGenerate(state.resumeTopic, state.resumeStep);
    }
  }, [location.state]);

  // Load today's generation count
  useEffect(() => {
    if (!user) return;
    const loadCount = async () => {
      const now = new Date();
      const resetTime = new Date();
      resetTime.setHours(6, 0, 0, 0);
      if (now.getHours() < 6) resetTime.setDate(resetTime.getDate() - 1);
      const { count } = await supabase
        .from("user_library")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", resetTime.toISOString());
      setTodayCount(count || 0);
    };
    loadCount();
  }, [user]);

  // Animated loading messages
  useEffect(() => {
    if (isLoading) {
      let idx = 0;
      setLoadingMsg(MESHY_LOADING_MESSAGES[0]);
      loadingMsgRef.current = setInterval(() => {
        idx = (idx + 1) % MESHY_LOADING_MESSAGES.length;
        setLoadingMsg(MESHY_LOADING_MESSAGES[idx]);
      }, 3000);
      return () => { if (loadingMsgRef.current) clearInterval(loadingMsgRef.current); };
    }
  }, [isLoading]);

  const lastNarratedStep = useRef<number>(-1);

  // Auto-play logic
  useEffect(() => {
    if (!isAutoPlaying || !simulation) return;
    if (!isMuted && step && lastNarratedStep.current !== currentStep) {
      lastNarratedStep.current = currentStep;
      const text = language === "en" ? step.narration_en : step.narration_hi;
      speak(text, language);
      return;
    }
    if (isSpeaking) return;
    autoPlayRef.current = setTimeout(() => {
      if (currentStep < simulation.steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        setIsAutoPlaying(false);
        lastNarratedStep.current = -1;
      }
    }, isMuted ? 5000 : 1500);
    return () => { if (autoPlayRef.current) clearTimeout(autoPlayRef.current); };
  }, [isAutoPlaying, currentStep, simulation, isMuted, language, step, speak, isSpeaking]);

  useEffect(() => {
    if (!isAutoPlaying) lastNarratedStep.current = -1;
  }, [isAutoPlaying]);

  const handleAutoPlay = () => {
    if (isAutoPlaying) { setIsAutoPlaying(false); stopTTS(); }
    else if (isSpeaking) { stopTTS(); }
    else { setIsAutoPlaying(true); }
  };

  // Poll Meshy task status until SUCCEEDED or FAILED
  const pollMeshyTask = async (taskId: string): Promise<{ status: string; model_urls?: { glb?: string } }> => {
    while (!abortRef.current) {
      const { data, error } = await supabase.functions.invoke("meshy-3d", {
        body: { action: "check_status", task_id: taskId },
      });
      if (error) throw error;
      if (data.status === "SUCCEEDED") return data;
      if (data.status === "FAILED" || data.status === "EXPIRED") throw new Error(`Meshy task ${data.status}`);
      // Update progress
      setLoadingProgress((prev) => Math.min(prev + 2, 90));
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    }
    throw new Error("Generation cancelled");
  };

  const handleGenerate = async (topic?: string, resumeStep?: number) => {
    const t = topic || topicInput;
    if (!t.trim()) return;
    setTopicInput(t);
    abortRef.current = false;
    setIsLoading(true);
    setSimulation(null);
    setModelParts([]);
    setLoadingProgress(5);
    setShowPanel(true);

    const slug = t.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

    // 1. Check if model already exists in DB
    const { data: existingModel } = await supabase
      .from("models").select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (existingModel?.file_url) {
      // Model exists — load it and get simulation
      setModelUrl(existingModel.file_url);
      setLoadingProgress(40);
      setMeshyStage("Loading existing model...");

      let parts: string[] = existingModel.named_parts?.length ? existingModel.named_parts : [];
      if (!parts.length && existingModel.file_url.endsWith(".glb")) {
        parts = await extractModelPartsFromGlb(existingModel.file_url);
        setModelParts(parts);
      }

      // Check simulation cache
      const { data: cached } = await supabase.from("simulation_cache").select("*").eq("model_id", existingModel.id).eq("language", "en").maybeSingle();
      if (cached?.ai_response) {
        setLoadingProgress(90);
        const normalized = normalizeSimulationData(cached.ai_response, parts, t);
        setSimulation(normalized);
        setCurrentStep(resumeStep || 0);
        setLoadingProgress(100);
        await supabase.from("simulation_cache").update({ serve_count: (cached.serve_count || 0) + 1 }).eq("id", cached.id);
        if (user) {
          supabase.from("user_library").upsert({ user_id: user.id, model_id: existingModel.id, last_step: resumeStep || 0 }, { onConflict: "user_id,model_id" }).then(() => {});
        }
        setTimeout(() => setIsLoading(false), 300);
        return;
      }

      // Generate simulation via enhance-model
      setLoadingProgress(60);
      try {
        const { data: simData, error } = await supabase.functions.invoke("enhance-model", {
          body: { modelName: t, subject: existingModel.subject || "science", namedParts: parts, language: "en" },
        });
        if (!error && simData?.steps) {
          const normalized = normalizeSimulationData(simData, parts, t);
          setSimulation(normalized);
          setCurrentStep(resumeStep || 0);
          if (user) {
            supabase.from("user_library").upsert({ user_id: user.id, model_id: existingModel.id, last_step: resumeStep || 0 }, { onConflict: "user_id,model_id" }).then(() => {});
          }
          // Cache it
          const normalizedJson = normalized as unknown as Json;
          const { data: ec } = await supabase.from("simulation_cache").select("id").eq("model_id", existingModel.id).eq("language", "en").maybeSingle();
          if (ec?.id) await supabase.from("simulation_cache").update({ ai_response: normalizedJson }).eq("id", ec.id);
          else await supabase.from("simulation_cache").insert([{ model_id: existingModel.id, language: "en", ai_response: normalizedJson }]);
          setTodayCount(prev => prev + 1);
        }
      } catch (err) {
        console.error("Simulation generation failed:", err);
        setSimulation(normalizeSimulationData(null, parts, t));
      }
      setLoadingProgress(100);
      setTimeout(() => setIsLoading(false), 400);
      return;
    }

    // 2. No existing model — generate via Meshy AI
    if (remaining <= 0) {
      setIsLoading(false);
      return;
    }

    try {
      // Step A: Create preview
      setMeshyStage("Creating 3D preview...");
      setLoadingProgress(10);
      const { data: previewData, error: previewErr } = await supabase.functions.invoke("meshy-3d", {
        body: {
          action: "create_preview",
          prompt: `A detailed, realistic, educational 3D model of ${t}. Scientific accuracy. Clean topology. Suitable for student learning.`,
          negativePrompt: "low quality, low resolution, low poly, ugly, blurry, cartoon, abstract",
        },
      });
      if (previewErr) throw previewErr;

      // Step B: Poll preview
      setMeshyStage("Generating 3D mesh...");
      setLoadingProgress(20);
      const previewResult = await pollMeshyTask(previewData.task_id);

      // Step C: Create refine
      setMeshyStage("Refining with textures...");
      setLoadingProgress(50);
      const { data: refineData, error: refineErr } = await supabase.functions.invoke("meshy-3d", {
        body: { action: "create_refine", preview_task_id: previewData.task_id },
      });
      if (refineErr) throw refineErr;

      // Step D: Poll refine
      setMeshyStage("Applying HD textures...");
      setLoadingProgress(60);
      const refineResult = await pollMeshyTask(refineData.task_id);

      const glbUrl = refineResult.model_urls?.glb;
      if (!glbUrl) throw new Error("No GLB URL in refined result");

      // Step E: Save model to storage + DB
      setMeshyStage("Saving 3D model...");
      setLoadingProgress(85);
      const { data: saveData, error: saveErr } = await supabase.functions.invoke("meshy-3d", {
        body: { action: "save_model", glb_url: glbUrl, topic: t, subject: "science" },
      });
      if (saveErr) throw saveErr;

      setModelUrl(saveData.file_url);
      setLoadingProgress(90);

      // Extract parts from the new model
      let parts: string[] = [];
      if (saveData.file_url?.endsWith(".glb")) {
        parts = await extractModelPartsFromGlb(saveData.file_url);
        setModelParts(parts);
      }

      // Step F: Generate simulation
      setMeshyStage("Creating learning simulation...");
      const { data: simData, error: simErr } = await supabase.functions.invoke("enhance-model", {
        body: { modelName: t, subject: "science", namedParts: parts, language: "en" },
      });

      if (!simErr && simData?.steps) {
        const normalized = normalizeSimulationData(simData, parts, t);
        setSimulation(normalized);
        setCurrentStep(resumeStep || 0);

        // Save to library and cache
        if (user && saveData.model_id) {
          supabase.from("user_library").upsert({ user_id: user.id, model_id: saveData.model_id, last_step: resumeStep || 0 }, { onConflict: "user_id,model_id" }).then(() => {});
          const normalizedJson = normalized as unknown as Json;
          await supabase.from("simulation_cache").insert([{ model_id: saveData.model_id, language: "en", ai_response: normalizedJson }]);
        }
        setTodayCount(prev => prev + 1);
      } else {
        setSimulation(normalizeSimulationData(null, parts, t));
      }
    } catch (err) {
      console.error("Meshy generation failed:", err);
      // Fallback: show simulation without 3D model
      setSimulation(normalizeSimulationData(null, [], t));
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
          className="bg-primary text-primary-foreground px-4 rounded-lg text-[11px] font-bold hover:bg-primary/90 transition-all press disabled:opacity-40 flex items-center gap-1.5 shrink-0"
        >
          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
          <span className="hidden sm:inline">Generate</span>
        </button>
      </div>

      {/* Generation limit + topic chips */}
      <div className="px-3 flex items-center gap-2 pb-2 shrink-0">
        <div className="flex items-center gap-1 bg-card border border-border rounded-md px-2 py-1 shrink-0">
          <Atom size={10} className={remaining > 0 ? "text-primary-custom" : "text-tertiary-custom"} />
          <span className="text-[9px] font-bold text-tertiary-custom tabular-nums">{remaining}/{MAX_FREE_GENERATIONS}</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {topicSuggestions.map((t) => (
            <button
              key={t}
              onClick={() => handleGenerate(t)}
              disabled={isLoading}
              className="shrink-0 px-2.5 py-1 bg-card border border-border rounded-md text-[10px] text-tertiary-custom hover:border-primary/20 hover:text-primary-custom transition-all disabled:opacity-40 press font-medium"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Limit reached overlay */}
      {remaining <= 0 && !simulation && (
        <div className="mx-3 mb-2 bg-card border border-border rounded-xl p-4 text-center animate-scale-up">
          <Crown size={20} className="text-tertiary-custom mx-auto mb-2" />
          <p className="text-[12px] font-bold text-primary-custom mb-1">Daily limit reached</p>
          <p className="text-[10px] text-tertiary-custom mb-3">You've used {MAX_FREE_GENERATIONS} free generations today</p>
          <button className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-[11px] font-bold press hover:bg-primary/90 transition-all">
            Upgrade Plan
          </button>
        </div>
      )}

      {/* 3D Canvas */}
      <div className="flex-1 mx-3 mb-1 bg-canvas rounded-xl border border-border overflow-hidden relative min-h-0">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 px-6">
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
                <Box size={28} strokeWidth={1} className="text-primary-custom" style={{ animation: "spin 3s linear infinite" }} />
              </div>
              <div className="absolute -inset-3 rounded-xl border border-border" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
            </div>
            <div className="w-full max-w-[200px]">
              <Progress value={loadingProgress} className="h-1.5" />
            </div>
            <p className="text-[11px] text-primary-custom font-medium text-center animate-fade-in">{loadingMsg}</p>
            {meshyStage && (
              <p className="text-[9px] text-tertiary-custom uppercase tracking-widest">{meshyStage}</p>
            )}
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
              <button className="w-7 h-7 bg-card/90 backdrop-blur-sm border border-border rounded-md flex items-center justify-center press">
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

      {/* Bottom Panel */}
      {simulation && !isLoading && (
        <div className={`bg-card border-t border-border rounded-t-xl transition-all duration-300 ${showPanel ? "max-h-[40vh]" : "max-h-[90px]"} flex flex-col shrink-0 overflow-hidden mb-14 md:mb-0`}>
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="w-full flex items-center justify-center py-1.5 shrink-0 active:bg-secondary"
          >
            <div className="w-8 h-0.5 bg-border rounded-full" />
          </button>

          {/* Step progress */}
          <div className="px-3 pb-1.5 flex gap-0.5 shrink-0">
            {simulation.steps.map((s, i) => (
              <button
                key={i}
                onClick={() => { stopTTS(); setCurrentStep(i); }}
                className="flex-1 h-1 rounded-full transition-all duration-200 press"
                style={{
                  backgroundColor: i === currentStep
                    ? (s.color || "hsl(var(--primary))")
                    : i < currentStep
                      ? "hsl(var(--primary) / 0.3)"
                      : "hsl(var(--border))",
                }}
              />
            ))}
          </div>

          {step && showPanel && (
            <div className="px-4 flex-1 overflow-y-auto animate-fade-in" key={currentStep}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: step.color }} />
                <h3 className="text-[13px] font-bold text-primary-custom">{step.title}</h3>
              </div>
              <p className="text-[11px] text-secondary-custom leading-relaxed pl-4">
                {language === "en" ? step.narration_en : step.narration_hi}
              </p>
              <div className="flex items-center gap-2 mt-2 pl-4">
                <div className="flex items-end gap-[2px]">
                  {[6, 12, 5, 9].map((h, i) => (
                    <div key={i} className="w-[1.5px] bg-primary-custom rounded-full transition-all"
                      style={{ height: isSpeaking ? h : 2, transitionDuration: "300ms", transitionDelay: `${i * 80}ms` }} />
                  ))}
                </div>
                <span className="text-[9px] text-tertiary-custom uppercase tracking-wider font-medium">
                  {isSpeaking ? "Speaking..." : "Tap ▶ to listen"}
                </span>
              </div>
            </div>
          )}

          <div className="px-3 py-2 flex items-center justify-between shrink-0 border-t border-border">
            <div className="flex rounded-md overflow-hidden border border-border h-6">
              {(["en", "hi"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => { stopTTS(); setLanguage(l); }}
                  className={`px-2 text-[9px] font-bold transition-colors press ${
                    language === l ? "bg-primary text-primary-foreground" : "text-tertiary-custom hover:bg-secondary"
                  }`}
                >
                  {l === "en" ? "EN" : "हिं"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => goStep(-1)} disabled={currentStep === 0} className="w-7 h-7 rounded-md border border-border flex items-center justify-center disabled:opacity-20 press">
                <ChevronLeft size={12} strokeWidth={1.5} className="text-tertiary-custom" />
              </button>
              <button onClick={handleAutoPlay}
                className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 press transition-all">
                {isAutoPlaying ? <Pause size={12} className="text-primary-foreground" /> : isSpeaking ? <Square size={10} className="text-primary-foreground" /> : <Play size={12} className="text-primary-foreground ml-0.5" />}
              </button>
              <button onClick={() => goStep(1)} disabled={currentStep === (simulation?.steps.length ?? 0) - 1} className="w-7 h-7 rounded-md border border-border flex items-center justify-center disabled:opacity-20 press">
                <ChevronRight size={12} strokeWidth={1.5} className="text-tertiary-custom" />
              </button>
              <button onClick={() => setIsMuted(!isMuted)} className="w-7 h-7 rounded-md border border-border flex items-center justify-center press">
                {isMuted ? <VolumeX size={11} className="text-tertiary-custom" /> : <Volume2 size={11} className="text-tertiary-custom" />}
              </button>
            </div>

            <button className="w-7 h-7 rounded-md border border-border flex items-center justify-center press">
              <Share2 size={11} className="text-tertiary-custom" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
