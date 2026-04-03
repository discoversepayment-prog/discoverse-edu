import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import {
  Sparkles, ChevronLeft, ChevronRight, Play, Pause,
  Volume2, VolumeX, RotateCcw, Loader2, Wand2,
  Eye, Crown, Box, Zap, Diamond, Share2, Lock,
} from "lucide-react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ModelViewer } from "./ModelViewer";
import { UpgradeDialog } from "./UpgradeDialog";
import { useApp } from "@/contexts/AppContext";
import { useTTS } from "@/hooks/useTTS";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface SimStep {
  title: string;
  part: string;
  color: string;
  narration_en: string;
  narration_hi: string;
  label_en: string;
  label_hi: string;
  function_en?: string;
  function_hi?: string;
  animation?: string;
  isolate?: boolean;
  camera?: { x: number; y: number; z: number };
}

interface Simulation {
  title: string;
  steps: SimStep[];
}

const topicSuggestions = ["Human Heart", "DNA Structure", "Solar System", "Atom Model", "Human Brain", "Lungs"];
const fallbackStepColors = ["#CC4444", "#4488CC", "#44AA44", "#D17A00", "#7D4CC2", "#D14A8B"];

const CURIOSITY_FACTS = [
  { emoji: "🫀", title: "What happens when your heart breaks?", desc: "Your brain releases stress hormones that can temporarily weaken your heart muscle. It's called Takotsubo cardiomyopathy." },
  { emoji: "🧬", title: "Your DNA is 99.9% identical to every human", desc: "That 0.1% difference is what makes you unique — eye color, height, even personality traits." },
  { emoji: "⚡", title: "Your brain generates enough electricity to power a light bulb", desc: "About 12-25 watts of power. Your neurons fire 200 times per second!" },
  { emoji: "🦴", title: "Babies have 300 bones, adults only 206", desc: "As you grow, many bones fuse together. Your skull alone has 22 bones!" },
  { emoji: "🫁", title: "Your lungs have the surface area of a tennis court", desc: "If you spread out all the alveoli, they'd cover about 70 square meters." },
  { emoji: "🔬", title: "A single cell contains 6 feet of DNA", desc: "If you uncoiled all the DNA in your body, it would stretch to Pluto and back." },
];

const normalizeToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const resolvePartName = (candidate: string, availableParts: string[]) => {
  const trimmed = candidate.trim();
  if (!trimmed || availableParts.length === 0) return "";
  if (availableParts.includes(trimmed)) return trimmed;
  const nc = normalizeToken(trimmed);
  const exact = availableParts.find((p) => normalizeToken(p) === nc);
  if (exact) return exact;
  const partial = availableParts.find((p) => {
    const np = normalizeToken(p);
    return np.includes(nc) || nc.includes(np);
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
      color: typeof step.color === "string" && /^#([0-9a-fA-F]{6})$/.test(step.color) ? step.color : fallbackStepColors[index % fallbackStepColors.length],
      narration_en: typeof step.narration_en === "string" && step.narration_en.trim() ? step.narration_en.trim() : `Let's explore ${topicLabel}.`,
      narration_hi: typeof step.narration_hi === "string" && step.narration_hi.trim() ? step.narration_hi.trim() : `${topicLabel} को समझते हैं।`,
      label_en: typeof step.label_en === "string" && step.label_en.trim() ? step.label_en.trim() : topicLabel,
      label_hi: typeof step.label_hi === "string" && step.label_hi.trim() ? step.label_hi.trim() : topicLabel,
      function_en: typeof step.function_en === "string" ? step.function_en.trim() : "",
      function_hi: typeof step.function_hi === "string" ? step.function_hi.trim() : "",
      animation: typeof step.animation === "string" ? step.animation : "",
      isolate: typeof step.isolate === "boolean" ? step.isolate : index > 0 && index < rawSteps.length - 1,
      camera: step.camera && typeof step.camera.x === "number" ? step.camera : { x: 0, y: 0, z: 4 },
    };
  });
  if (steps.length > 0) return { title: typeof sim?.title === "string" && sim.title.trim() ? sim.title.trim() : topicLabel, steps };
  return {
    title: topicLabel,
    steps: [{ title: topicLabel, part: "", color: fallbackStepColors[0], narration_en: `This is ${topicLabel}. Let's break it down.`, narration_hi: `यह ${topicLabel} है। आइए समझते हैं।`, label_en: topicLabel, label_hi: topicLabel, function_en: "", function_hi: "", animation: "", isolate: false, camera: { x: 0, y: 0, z: 4 } }],
  };
};

const POLL_INTERVAL = 3000;
const AUTOPLAY_DELAY = 6000;

// D1 vs D2 comparison data
const D1_VS_D2 = {
  d1: { label: "D1 Standard", speed: "3-5 min", quality: "Basic", gens: "3/day", features: ["Simple mesh", "Basic colors", "5 steps", "Standard detail"] },
  d2: { label: "D2 Pro", speed: "1-2 min", quality: "HD Realistic", gens: "15/month", features: ["HD textures", "Photorealistic", "8 steps", "Animations", "Part isolation"] },
};

export function LearnView() {
  const { user } = useAuth();
  const location = useLocation();
  const { isPro, remaining, incrementUsage, reload: reloadSub } = useSubscription();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [topicInput, setTopicInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelParts, setModelParts] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [meshyStage, setMeshyStage] = useState("");
  const [tier, setTier] = useState<"D1" | "D2">("D1");
  const [tappedPartInfo, setTappedPartInfo] = useState<{ name: string; func?: string } | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [curiosityIndex, setCuriosityIndex] = useState(0);
  const [showComparison, setShowComparison] = useState(false);
  const { language, setLanguage } = useApp();
  const { speak, stop: stopTTS, isSpeaking } = useTTS();
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeHandled = useRef(false);
  const abortRef = useRef(false);
  const lastNarratedStep = useRef<number>(-1);

  const step = simulation?.steps[currentStep];
  const resolvedHighlightPart = step ? resolvePartName(step.part, modelParts) || undefined : undefined;

  useEffect(() => {
    if (tier === "D2" && !isPro) setTier("D1");
  }, [isPro, tier]);

  useEffect(() => {
    const state = location.state as { resumeTopic?: string; resumeStep?: number } | null;
    if (state?.resumeTopic && !resumeHandled.current) {
      resumeHandled.current = true;
      setTopicInput(state.resumeTopic);
      handleGenerate(state.resumeTopic, state.resumeStep);
    }
  }, [location.state]);

  useEffect(() => {
    if (!isLoading) return;
    setCuriosityIndex(Math.floor(Math.random() * CURIOSITY_FACTS.length));
    // Show comparison briefly at start of generation
    setShowComparison(true);
    const compTimer = setTimeout(() => setShowComparison(false), 6000);
    const interval = setInterval(() => {
      setCuriosityIndex(prev => (prev + 1) % CURIOSITY_FACTS.length);
    }, 5000);
    return () => { clearInterval(interval); clearTimeout(compTimer); };
  }, [isLoading]);

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
      if (currentStep < simulation.steps.length - 1) setCurrentStep(prev => prev + 1);
      else { setIsAutoPlaying(false); lastNarratedStep.current = -1; }
    }, isMuted ? AUTOPLAY_DELAY : 1500);
    return () => { if (autoPlayRef.current) clearTimeout(autoPlayRef.current); };
  }, [isAutoPlaying, currentStep, simulation, isMuted, language, step, speak, isSpeaking]);

  useEffect(() => { if (!isAutoPlaying) lastNarratedStep.current = -1; }, [isAutoPlaying]);

  useEffect(() => {
    if (simulation && !isLoading && !isAutoPlaying) setIsAutoPlaying(true);
  }, [simulation, isLoading]);

  const handleAutoPlay = () => {
    if (isAutoPlaying) { setIsAutoPlaying(false); stopTTS(); }
    else if (isSpeaking) stopTTS();
    else setIsAutoPlaying(true);
  };

  const pollMeshyTask = async (taskId: string): Promise<{ status: string; model_urls?: { glb?: string } }> => {
    while (!abortRef.current) {
      const { data, error } = await supabase.functions.invoke("meshy-3d", { body: { action: "check_status", task_id: taskId } });
      if (error) throw error;
      if (data.status === "SUCCEEDED") return data;
      if (data.status === "FAILED" || data.status === "EXPIRED") throw new Error(`Task ${data.status}`);
      setLoadingProgress(prev => Math.min(prev + 3, 90));
      await new Promise(r => setTimeout(r, POLL_INTERVAL));
    }
    throw new Error("Cancelled");
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
    setIsAutoPlaying(false);
    setTappedPartInfo(null);

    // Check generation limit FIRST
    if (remaining <= 0) {
      setIsLoading(false);
      setShowUpgrade(true);
      return;
    }

    const slug = t.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

    // 1. Check DB for existing model
    const { data: existingModel } = await supabase.from("models").select("*").eq("slug", slug).eq("status", "published").maybeSingle();

    if (existingModel?.file_url) {
      setModelUrl(existingModel.file_url);
      setLoadingProgress(40);
      setMeshyStage("Loading model...");

      let parts: string[] = existingModel.named_parts?.length ? existingModel.named_parts : [];
      if (!parts.length && existingModel.file_url.endsWith(".glb")) {
        parts = await extractModelPartsFromGlb(existingModel.file_url);
        setModelParts(parts);
      } else {
        setModelParts(parts);
      }

      const { data: cached } = await supabase.from("simulation_cache").select("*").eq("model_id", existingModel.id).eq("language", "en").maybeSingle();
      if (cached?.ai_response) {
        setLoadingProgress(90);
        const normalized = normalizeSimulationData(cached.ai_response, parts, t);
        setSimulation(normalized);
        setCurrentStep(resumeStep || 0);
        setLoadingProgress(100);
        await supabase.from("simulation_cache").update({ serve_count: (cached.serve_count || 0) + 1 }).eq("id", cached.id);
        if (user) supabase.from("user_library").upsert({ user_id: user.id, model_id: existingModel.id, last_step: resumeStep || 0 }, { onConflict: "user_id,model_id" }).then(() => {});
        // Decrement generation count even for cached models
        await incrementUsage();
        setTimeout(() => setIsLoading(false), 300);
        return;
      }

      setLoadingProgress(60);
      try {
        const activeTier = isPro ? tier : "D1";
        const { data: simData, error } = await supabase.functions.invoke("enhance-model", {
          body: { modelName: t, subject: existingModel.subject || "science", namedParts: parts, language: "en", tier: activeTier },
        });
        if (!error && simData?.steps) {
          const normalized = normalizeSimulationData(simData, parts, t);
          setSimulation(normalized);
          setCurrentStep(resumeStep || 0);
          if (user) supabase.from("user_library").upsert({ user_id: user.id, model_id: existingModel.id, last_step: resumeStep || 0 }, { onConflict: "user_id,model_id" }).then(() => {});
          const normalizedJson = normalized as unknown as Json;
          const { data: ec } = await supabase.from("simulation_cache").select("id").eq("model_id", existingModel.id).eq("language", "en").maybeSingle();
          if (ec?.id) await supabase.from("simulation_cache").update({ ai_response: normalizedJson }).eq("id", ec.id);
          else await supabase.from("simulation_cache").insert([{ model_id: existingModel.id, language: "en", ai_response: normalizedJson }]);
        }
      } catch (err) {
        console.error("Simulation failed:", err);
        setSimulation(normalizeSimulationData(null, parts, t));
      }
      // Decrement generation count
      await incrementUsage();
      setLoadingProgress(100);
      setTimeout(() => setIsLoading(false), 400);
      return;
    }

    // 2. Generate via Meshy AI
    try {
      const activeTier = isPro ? tier : "D1";
      setMeshyStage("Creating 3D model...");
      setLoadingProgress(10);

      const meshyPrompt = activeTier === "D2"
        ? `A highly detailed, anatomically accurate, photorealistic educational 3D model of ${t}. Scientific precision. High-poly. Clear distinct labeled parts. Professional medical/scientific illustration quality.`
        : `A clean, educational 3D model of ${t}. Accurate proportions. Simple topology. Good for learning.`;

      const { data: previewData, error: previewErr } = await supabase.functions.invoke("meshy-3d", {
        body: { action: "create_preview", prompt: meshyPrompt, negativePrompt: "low quality, low resolution, low poly, ugly, blurry, cartoon, abstract" },
      });
      if (previewErr) throw previewErr;

      setMeshyStage("Generating 3D mesh...");
      setLoadingProgress(20);
      const previewResult = await pollMeshyTask(previewData.task_id);

      let finalGlbUrl: string | undefined;

      if (activeTier === "D2") {
        setMeshyStage("Applying HD textures...");
        setLoadingProgress(55);
        const { data: refineData, error: refineErr } = await supabase.functions.invoke("meshy-3d", {
          body: { action: "create_refine", preview_task_id: previewData.task_id },
        });
        if (refineErr) throw refineErr;
        setLoadingProgress(60);
        const refineResult = await pollMeshyTask(refineData.task_id);
        finalGlbUrl = refineResult.model_urls?.glb;
      } else {
        finalGlbUrl = previewResult.model_urls?.glb;
      }

      if (!finalGlbUrl) throw new Error("No GLB URL");

      setMeshyStage("Saving model...");
      setLoadingProgress(85);
      const { data: saveData, error: saveErr } = await supabase.functions.invoke("meshy-3d", {
        body: { action: "save_model", glb_url: finalGlbUrl, topic: t, subject: "science" },
      });
      if (saveErr) throw saveErr;

      setModelUrl(saveData.file_url);
      setLoadingProgress(90);

      let parts: string[] = [];
      if (saveData.file_url?.endsWith(".glb")) {
        parts = await extractModelPartsFromGlb(saveData.file_url);
        setModelParts(parts);
      }

      setMeshyStage("Creating learning steps...");
      const { data: simData, error: simErr } = await supabase.functions.invoke("enhance-model", {
        body: { modelName: t, subject: "science", namedParts: parts, language: "en", tier: activeTier },
      });

      if (!simErr && simData?.steps) {
        const normalized = normalizeSimulationData(simData, parts, t);
        setSimulation(normalized);
        setCurrentStep(resumeStep || 0);
        if (user && saveData.model_id) {
          supabase.from("user_library").upsert({ user_id: user.id, model_id: saveData.model_id, last_step: resumeStep || 0 }, { onConflict: "user_id,model_id" }).then(() => {});
          const normalizedJson = normalized as unknown as Json;
          await supabase.from("simulation_cache").insert([{ model_id: saveData.model_id, language: "en", ai_response: normalizedJson }]);
        }
      } else {
        setSimulation(normalizeSimulationData(null, parts, t));
      }
      await incrementUsage();
    } catch (err) {
      console.error("Generation failed:", err);
      setSimulation(normalizeSimulationData(null, [], t));
      setCurrentStep(0);
    }

    setLoadingProgress(100);
    setTimeout(() => setIsLoading(false), 400);
  };

  const onPartsLoaded = useCallback((parts: string[]) => {
    setModelParts(parts);
    setSimulation(prev => prev ? normalizeSimulationData(prev, parts, prev.title || topicInput || "Simulation") : prev);
  }, [topicInput]);

  const goStep = (dir: number) => {
    if (!simulation) return;
    stopTTS();
    const next = currentStep + dir;
    if (next >= 0 && next < simulation.steps.length) setCurrentStep(next);
  };

  const handlePartTapped = useCallback((part: { name: string }) => {
    const matchingStep = simulation?.steps.find(s => {
      const resolved = resolvePartName(s.part, modelParts);
      return resolved === part.name;
    });
    setTappedPartInfo({ name: part.name, func: matchingStep ? (language === "en" ? matchingStep.function_en : matchingStep.function_hi) : undefined });
    setTimeout(() => setTappedPartInfo(null), 4000);
  }, [simulation, modelParts, language]);

  const handleShare = async () => {
    const text = `Check out this 3D model of "${topicInput}" on Discoverse AI! 🔬`;
    const url = `${window.location.origin}/app?topic=${encodeURIComponent(topicInput)}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Discoverse AI", text, url }); }
      catch {}
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success("Link copied!");
    }
  };

  const handleRemake = () => {
    if (!topicInput.trim() || isLoading) return;
    handleGenerate(topicInput);
  };

  const curiosityFact = CURIOSITY_FACTS[curiosityIndex];

  return (
    <div className="flex flex-col h-full relative">
      <UpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />

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

      {/* Tier selector + topic chips */}
      <div className="px-3 flex items-center gap-2 pb-2 shrink-0">
        <div className="flex rounded-lg overflow-hidden border border-border shrink-0">
          <button onClick={() => setTier("D1")} className={`px-2.5 py-1 text-[9px] font-bold flex items-center gap-1 transition-colors ${tier === "D1" ? "bg-primary text-primary-foreground" : "text-tertiary-custom hover:bg-secondary"}`}>
            <Zap size={8} /> D1
          </button>
          <button
            onClick={() => isPro ? setTier("D2") : setShowUpgrade(true)}
            className={`px-2.5 py-1 text-[9px] font-bold flex items-center gap-1 transition-colors ${
              tier === "D2" ? "bg-accent text-accent-foreground" : "text-tertiary-custom hover:bg-secondary"
            }`}
          >
            {!isPro && <Lock size={7} />}
            <Diamond size={8} /> D2
          </button>
        </div>

        <div className="flex items-center gap-1 bg-card border border-border rounded-md px-2 py-1 shrink-0">
          <span className="text-[9px] font-bold text-tertiary-custom tabular-nums">{remaining} left</span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {topicSuggestions.map((t) => (
            <button key={t} onClick={() => handleGenerate(t)} disabled={isLoading}
              className="shrink-0 px-2.5 py-1 bg-card border border-border rounded-md text-[10px] text-tertiary-custom hover:border-primary/20 hover:text-primary-custom transition-all disabled:opacity-40 press font-medium">
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Limit reached */}
      {remaining <= 0 && !simulation && !isLoading && (
        <div className="mx-3 mb-2 bg-card border border-border rounded-xl p-4 text-center animate-scale-in">
          <Crown size={20} className="text-yellow-500 mx-auto mb-2" />
          <p className="text-[12px] font-bold text-primary-custom mb-1">Generation limit reached</p>
          <p className="text-[10px] text-tertiary-custom mb-3">Upgrade to Pro for 15 generations/month</p>
          <button onClick={() => setShowUpgrade(true)} className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-[11px] font-bold press hover:bg-primary/90 transition-all">
            Upgrade to Pro
          </button>
        </div>
      )}

      {/* 3D Canvas */}
      <div className="flex-1 mx-3 mb-1 bg-canvas rounded-xl border border-border overflow-hidden relative min-h-0">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 px-6 overflow-y-auto">
            {/* D1 vs D2 Comparison - shown at start of generation */}
            {showComparison && (
              <div className="w-full max-w-[340px] animate-fade-in mb-2">
                <p className="text-[9px] font-bold text-tertiary-custom uppercase tracking-widest text-center mb-2">Generation Quality</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`border rounded-lg p-3 ${tier === "D1" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <p className="text-[10px] font-bold text-primary-custom flex items-center gap-1"><Zap size={9} /> D1 Standard</p>
                    <div className="mt-2 space-y-1">
                      {D1_VS_D2.d1.features.map(f => (
                        <p key={f} className="text-[8px] text-tertiary-custom">• {f}</p>
                      ))}
                    </div>
                    <p className="text-[8px] text-secondary-custom mt-2 font-mono">{D1_VS_D2.d1.gens} · {D1_VS_D2.d1.speed}</p>
                  </div>
                  <div className={`border rounded-lg p-3 ${tier === "D2" ? "border-accent bg-accent/5" : "border-border"}`}>
                    <p className="text-[10px] font-bold text-accent flex items-center gap-1"><Diamond size={9} /> D2 Pro {!isPro && <Lock size={7} />}</p>
                    <div className="mt-2 space-y-1">
                      {D1_VS_D2.d2.features.map(f => (
                        <p key={f} className="text-[8px] text-accent/70">✦ {f}</p>
                      ))}
                    </div>
                    <p className="text-[8px] text-accent/50 mt-2 font-mono">{D1_VS_D2.d2.gens} · {D1_VS_D2.d2.speed}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Custom loading animation */}
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden">
                <div className="relative">
                  <Box size={24} strokeWidth={1} className="text-primary-custom" style={{ animation: "spin 2s linear infinite" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary-custom animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="absolute -inset-2 border border-primary/10 rounded-2xl" style={{ animation: "spin 4s linear infinite reverse" }} />
            </div>

            <div className="w-full max-w-[200px]">
              <Progress value={loadingProgress} className="h-1.5" />
              <p className="text-[9px] text-tertiary-custom text-center mt-1 tabular-nums">{Math.round(loadingProgress)}%</p>
            </div>

            {meshyStage && <p className="text-[9px] text-primary-custom font-medium text-center uppercase tracking-widest">{meshyStage}</p>}

            {/* Curiosity content */}
            {!showComparison && (
              <div className="bg-card/80 border border-border rounded-xl p-3 max-w-[260px] animate-fade-in" key={curiosityIndex}>
                <p className="text-[18px] mb-1 text-center">{curiosityFact.emoji}</p>
                <p className="text-[10px] font-bold text-primary-custom text-center mb-0.5">{curiosityFact.title}</p>
                <p className="text-[9px] text-secondary-custom text-center leading-relaxed">{curiosityFact.desc}</p>
              </div>
            )}
          </div>
        ) : simulation ? (
          <>
            <ModelViewer
              modelUrl={modelUrl}
              highlightPart={resolvedHighlightPart}
              highlightColor={step?.color}
              isolatePart={step?.isolate}
              animationType={step?.animation}
              onPartsLoaded={onPartsLoaded}
              onPartTapped={handlePartTapped}
            />

            {/* Step indicator */}
            <div className="absolute top-2.5 left-2.5 bg-card/90 backdrop-blur-sm border border-border rounded-md px-2 py-1 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: step?.color || "hsl(var(--primary))" }} />
              <span className="text-[10px] font-bold text-primary-custom font-mono">{currentStep + 1}/{simulation.steps.length}</span>
            </div>

            {/* Part label + function */}
            {step && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm border border-border px-3 py-1.5 rounded-lg animate-fade-in max-w-[300px]" key={currentStep}>
                <p className="text-[11px] font-bold text-primary-custom flex items-center gap-1.5 uppercase tracking-wider">
                  <Eye size={10} className="text-tertiary-custom" />
                  {language === "en" ? step.label_en : step.label_hi}
                </p>
                {(step.function_en || step.function_hi) && (
                  <p className="text-[9px] text-secondary-custom mt-0.5">{language === "en" ? step.function_en : step.function_hi}</p>
                )}
              </div>
            )}

            {/* Tapped part tooltip */}
            {tappedPartInfo && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-md border border-primary/30 px-4 py-2 rounded-xl animate-scale-in shadow-lg z-10">
                <p className="text-[11px] font-bold text-primary-custom">{tappedPartInfo.name.replace(/_/g, " ")}</p>
                {tappedPartInfo.func && <p className="text-[9px] text-secondary-custom mt-0.5">{tappedPartInfo.func}</p>}
              </div>
            )}

            {/* Canvas controls */}
            <div className="absolute top-2.5 right-2.5 flex gap-1">
              <button onClick={handleShare} className="w-7 h-7 bg-card/90 backdrop-blur-sm border border-border rounded-md flex items-center justify-center press" title="Share">
                <Share2 size={11} strokeWidth={1.5} className="text-tertiary-custom" />
              </button>
              <button onClick={handleRemake} disabled={isLoading} className="w-7 h-7 bg-card/90 backdrop-blur-sm border border-border rounded-md flex items-center justify-center press disabled:opacity-40" title="Regenerate">
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
        <div className="bg-card border-t border-border rounded-t-xl flex flex-col shrink-0 overflow-hidden mb-14 md:mb-0">
          {/* Step progress bar */}
          <div className="px-3 pt-2 pb-1.5 flex gap-0.5 shrink-0">
            {simulation.steps.map((s, i) => (
              <button key={i} onClick={() => { stopTTS(); setCurrentStep(i); }}
                className="flex-1 h-1 rounded-full transition-all duration-200 press"
                style={{ backgroundColor: i === currentStep ? (s.color || "hsl(var(--primary))") : i < currentStep ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border))" }} />
            ))}
          </div>

          {/* Step content */}
          {step && (
            <div className="px-4 py-2 animate-fade-in" key={currentStep}>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: step.color }} />
                <h3 className="text-[12px] font-bold text-primary-custom">{step.title}</h3>
              </div>
              <p className="text-[11px] text-secondary-custom leading-snug pl-4">{language === "en" ? step.narration_en : step.narration_hi}</p>
            </div>
          )}

          {/* Controls */}
          <div className="px-3 py-2 flex items-center justify-between shrink-0 border-t border-border">
            <div className="flex rounded-md overflow-hidden border border-border h-6">
              {(["en", "hi"] as const).map((l) => (
                <button key={l} onClick={() => { stopTTS(); setLanguage(l); }}
                  className={`px-2 text-[9px] font-bold transition-colors press ${language === l ? "bg-primary text-primary-foreground" : "text-tertiary-custom hover:bg-secondary"}`}>
                  {l === "en" ? "EN" : "हिं"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => goStep(-1)} disabled={currentStep === 0} className="w-7 h-7 rounded-md border border-border flex items-center justify-center disabled:opacity-20 press">
                <ChevronLeft size={12} strokeWidth={1.5} className="text-tertiary-custom" />
              </button>
              <button onClick={handleAutoPlay} className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 press transition-all">
                {isAutoPlaying ? <Pause size={12} className="text-primary-foreground" /> : <Play size={12} className="text-primary-foreground ml-0.5" />}
              </button>
              <button onClick={() => goStep(1)} disabled={currentStep === (simulation?.steps.length ?? 0) - 1} className="w-7 h-7 rounded-md border border-border flex items-center justify-center disabled:opacity-20 press">
                <ChevronRight size={12} strokeWidth={1.5} className="text-tertiary-custom" />
              </button>
              <button onClick={() => setIsMuted(!isMuted)} className="w-7 h-7 rounded-md border border-border flex items-center justify-center press">
                {isMuted ? <VolumeX size={11} className="text-tertiary-custom" /> : <Volume2 size={11} className="text-tertiary-custom" />}
              </button>
              <button onClick={handleShare} className="w-7 h-7 rounded-md border border-border flex items-center justify-center press">
                <Share2 size={11} className="text-tertiary-custom" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              {isPro && tier === "D2" && <span className="text-[8px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">D2</span>}
              {isPro && <span className="text-[8px] font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">PRO</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
