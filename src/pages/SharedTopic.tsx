import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ModelViewer } from "@/components/ModelViewer";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, Pause, ChevronLeft, ChevronRight, Lock, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/Logo";
import type { Json } from "@/integrations/supabase/types";

interface SimStep {
  title: string; part: string; color: string;
  narration_en: string; label_en: string; function_en?: string;
  animation?: string; isolate?: boolean;
}

interface Simulation { title: string; steps: SimStep[]; part_names?: Record<string, string>; }

export default function SharedTopic() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const topic = params.get("topic") || "";
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!topic) { setLoading(false); return; }
    const load = async () => {
      const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      const { data: model } = await supabase.from("models").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
      if (!model) { setLoading(false); return; }
      setModelUrl(model.file_url);
      const { data: cached } = await supabase.from("simulation_cache").select("ai_response").eq("model_id", model.id).eq("language", "en").maybeSingle();
      if (cached?.ai_response) {
        const sim = cached.ai_response as any;
        if (sim?.steps?.length) setSimulation(sim);
      }
      setLoading(false);
    };
    load();
  }, [topic]);

  useEffect(() => {
    if (!isPlaying || !simulation) return;
    autoRef.current = setTimeout(() => {
      if (currentStep < simulation.steps.length - 1) setCurrentStep(p => p + 1);
      else setIsPlaying(false);
    }, 5000);
    return () => { if (autoRef.current) clearTimeout(autoRef.current); };
  }, [isPlaying, currentStep, simulation]);

  const step = simulation?.steps[currentStep];

  if (!topic) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-secondary-custom">No topic specified.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Logo size={20} />
          <span className="text-[13px] font-bold text-primary-custom">Discoverse AI</span>
        </div>
        <button onClick={() => navigate("/auth")}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-[11px] font-bold press hover:bg-primary/90">
          <Sparkles size={12} /> Try Free
        </button>
      </header>

      {/* Topic title */}
      <div className="px-4 py-2 text-center">
        <h1 className="text-lg font-black text-primary-custom">{topic}</h1>
        <p className="text-[10px] text-tertiary-custom">Interactive 3D simulation — powered by Discoverse AI</p>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 mx-3 mb-2 bg-card rounded-xl border border-border overflow-hidden relative min-h-[300px]">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <Loader2 size={24} className="text-primary animate-spin" />
            <p className="text-[11px] text-secondary-custom">Loading 3D model...</p>
          </div>
        ) : modelUrl ? (
          <>
            <ModelViewer
              modelUrl={modelUrl}
              highlightPart={step?.part}
              highlightColor={step?.color}
              isolatePart={step?.isolate}
              animationType={step?.animation}
            />
            {step && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm border border-border px-3 py-1.5 rounded-lg max-w-[280px]">
                <p className="text-[11px] font-bold text-primary-custom">{step.label_en}</p>
                {step.function_en && <p className="text-[9px] text-secondary-custom mt-0.5">{step.function_en}</p>}
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-secondary-custom text-[12px]">Model not found. Sign up to generate it!</p>
          </div>
        )}
      </div>

      {/* Step controls */}
      {simulation && (
        <div className="bg-card border-t border-border px-4 py-3">
          <div className="flex gap-0.5 mb-2">
            {simulation.steps.map((s, i) => (
              <button key={i} onClick={() => setCurrentStep(i)}
                className="flex-1 h-1 rounded-full transition-all"
                style={{ backgroundColor: i === currentStep ? s.color : i < currentStep ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border))" }} />
            ))}
          </div>
          {step && (
            <div className="mb-2">
              <h3 className="text-[12px] font-bold text-primary-custom">{step.title}</h3>
              <p className="text-[11px] text-secondary-custom">{step.narration_en}</p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentStep(p => Math.max(0, p - 1))} disabled={currentStep === 0}
                className="w-7 h-7 rounded-md border border-border flex items-center justify-center disabled:opacity-20">
                <ChevronLeft size={12} className="text-tertiary-custom" />
              </button>
              <button onClick={() => setIsPlaying(!isPlaying)}
                className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                {isPlaying ? <Pause size={12} className="text-primary-foreground" /> : <Play size={12} className="text-primary-foreground ml-0.5" />}
              </button>
              <button onClick={() => setCurrentStep(p => Math.min((simulation?.steps.length ?? 1) - 1, p + 1))}
                disabled={currentStep === (simulation?.steps.length ?? 1) - 1}
                className="w-7 h-7 rounded-md border border-border flex items-center justify-center disabled:opacity-20">
                <ChevronRight size={12} className="text-tertiary-custom" />
              </button>
            </div>
            <button onClick={() => navigate("/auth")}
              className="flex items-center gap-1 text-[10px] font-bold text-primary-custom bg-primary/10 px-3 py-1.5 rounded-lg">
              <Lock size={10} /> Sign up to interact
            </button>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="px-4 py-4 text-center border-t border-border">
        <p className="text-[11px] text-secondary-custom mb-2">Generate your own 3D models for free</p>
        <button onClick={() => navigate("/auth")}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-[12px] font-bold press hover:bg-primary/90">
          Get Started Free →
        </button>
      </div>
    </div>
  );
}
