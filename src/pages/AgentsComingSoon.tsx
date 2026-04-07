import { Bot, Sparkles, Zap, Brain, MessageCircle } from "lucide-react";
import { MainLayout } from "@/components/MainLayout";

export default function AgentsComingSoon() {
  return (
    <MainLayout title="AI Agents">
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Bot size={36} className="text-primary" />
          </div>

          <h1 className="text-2xl font-black text-primary-custom tracking-tight mb-2">
            Discoverse AI Agents
          </h1>
          <p className="text-[13px] text-secondary-custom leading-relaxed mb-8">
            Personal AI tutors that teach you with 3D models, voice narration, and interactive quizzes.
            A whole new way to understand anything.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { icon: Brain, label: "Adaptive Learning", desc: "Adjusts to your pace" },
              { icon: MessageCircle, label: "Voice Chat", desc: "Talk naturally" },
              { icon: Sparkles, label: "3D Explanations", desc: "Visual understanding" },
              { icon: Zap, label: "Instant Quizzes", desc: "Test your knowledge" },
            ].map((f) => (
              <div key={f.label} className="bg-card border border-border rounded-xl p-3 text-left">
                <f.icon size={16} className="text-primary mb-1.5" />
                <p className="text-[11px] font-bold text-primary-custom">{f.label}</p>
                <p className="text-[9px] text-tertiary-custom">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="inline-flex items-center gap-2 bg-secondary border border-border rounded-full px-5 py-2.5">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-bold text-primary-custom uppercase tracking-widest">Coming Soon</span>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
