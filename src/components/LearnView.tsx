import { useState } from "react";
import {
  Sparkles, ChevronLeft, ChevronRight, Play, Pause,
  Volume2, Share2, RotateCcw, ZoomIn, ZoomOut, Maximize2,
  Atom, Eye, Grid3X3,
} from "lucide-react";

const demoSteps = [
  { title: "Overview: The Human Heart", part: "whole_heart", narrationEn: "The human heart is a muscular organ roughly the size of your fist. It beats about 100,000 times a day, pumping blood throughout your body.", narrationHi: "मानव हृदय एक पेशीय अंग है जो लगभग आपकी मुट्ठी के आकार का होता है। यह दिन में लगभग 1,00,000 बार धड़कता है।", labelEn: "Heart", labelHi: "हृदय" },
  { title: "The Left Ventricle: The Powerhouse", part: "left_ventricle", narrationEn: "The left ventricle is the strongest chamber. It pumps oxygenated blood to the entire body through the aorta with tremendous force.", narrationHi: "बायां निलय सबसे शक्तिशाली कक्ष है। यह महाधमनी के माध्यम से पूरे शरीर में ऑक्सीजन युक्त रक्त पंप करता है।", labelEn: "Left Ventricle", labelHi: "बायां निलय" },
  { title: "The Aorta: Highway of Life", part: "aorta", narrationEn: "The aorta is the largest artery in your body. It carries oxygen-rich blood from the left ventricle to all organs and tissues.", narrationHi: "महाधमनी आपके शरीर की सबसे बड़ी धमनी है। यह बाएं निलय से ऑक्सीजन युक्त रक्त सभी अंगों तक ले जाती है।", labelEn: "Aorta", labelHi: "महाधमनी" },
  { title: "The Right Atrium: Receiving Chamber", part: "right_atrium", narrationEn: "The right atrium receives deoxygenated blood from the body through the vena cava. It then passes this blood to the right ventricle.", narrationHi: "दायां अलिंद वेना कावा के माध्यम से शरीर से डीऑक्सीजनेटेड रक्त प्राप्त करता है।", labelEn: "Right Atrium", labelHi: "दायां अलिंद" },
  { title: "The Pulmonary Artery: To the Lungs", part: "pulmonary_artery", narrationEn: "The pulmonary artery carries deoxygenated blood from the right ventricle to the lungs for re-oxygenation. It's the only artery that carries deoxygenated blood.", narrationHi: "फुफ्फुसीय धमनी दाएं निलय से डीऑक्सीजनेटेड रक्त को फेफड़ों तक ले जाती है।", labelEn: "Pulmonary Artery", labelHi: "फुफ्फुसीय धमनी" },
  { title: "The Complete Cardiac Cycle", part: "whole_heart", narrationEn: "All chambers work together in perfect rhythm. The heart contracts and relaxes in a coordinated cycle, ensuring continuous blood flow throughout your body.", narrationHi: "सभी कक्ष एक साथ लयबद्ध तरीके से काम करते हैं। हृदय एक समन्वित चक्र में सिकुड़ता और शिथिल होता है।", labelEn: "Cardiac Cycle", labelHi: "हृदय चक्र" },
];

const topicSuggestions = ["Human Heart", "DNA Structure", "Solar System", "Atom Model", "Cell Division"];

export function LearnView() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasSimulation, setHasSimulation] = useState(false);
  const [topicInput, setTopicInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [viewMode, setViewMode] = useState<"3d" | "wire" | "xray">("3d");

  const step = demoSteps[currentStep];

  const handleGenerate = (topic?: string) => {
    const t = topic || topicInput;
    if (!t.trim()) return;
    setTopicInput(t);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setHasSimulation(true);
      setCurrentStep(0);
    }, 2000);
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-background">
      {/* Canvas Area */}
      <div className="flex-1 md:w-[62%] flex flex-col p-4 md:p-6 gap-4 min-w-0">
        {/* Topic input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Sparkles size={18} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent" />
            <input
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="Enter any topic to explore in 3D..."
              className="w-full bg-card border border-border rounded-[10px] h-11 pl-10 pr-4 text-[15px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            onClick={() => handleGenerate()}
            className="bg-primary text-primary-foreground px-5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 active:scale-[0.97]"
          >
            Generate
          </button>
        </div>

        {/* Suggestion chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {topicSuggestions.map((t) => (
            <button
              key={t}
              onClick={() => handleGenerate(t)}
              className="shrink-0 px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-secondary-custom hover:border-accent hover:text-accent transition-colors duration-150"
            >
              {t}
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-canvas rounded-2xl border border-subtle overflow-hidden relative shadow-sm min-h-[300px]">
          {isLoading ? (
            <LoadingState topic={topicInput} />
          ) : hasSimulation ? (
            <CanvasContent step={step} language={language} viewMode={viewMode} />
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <Atom size={64} strokeWidth={1} className="text-border mx-auto mb-4" />
                <p className="text-secondary-custom text-[15px]">Enter a topic to generate a 3D simulation</p>
                <p className="text-tertiary-custom text-[13px] mt-1">The AI will find the best model and create an interactive experience</p>
              </div>
            </div>
          )}

          {/* Canvas controls */}
          {hasSimulation && !isLoading && (
            <>
              <div className="absolute top-3 right-3 flex flex-col gap-1 bg-card/90 border border-border rounded-lg p-1">
                {[RotateCcw, ZoomIn, ZoomOut, Maximize2].map((Icon, i) => (
                  <button key={i} className="p-1.5 hover:bg-background-secondary rounded transition-colors">
                    <Icon size={16} strokeWidth={1.5} className="text-secondary-custom" />
                  </button>
                ))}
              </div>
              <div className="absolute bottom-3 left-3 flex gap-1 bg-card/90 border border-border rounded-lg p-1">
                {(["3d", "wire", "xray"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setViewMode(v)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      viewMode === v ? "font-medium text-primary-custom" : "text-tertiary-custom"
                    }`}
                  >
                    {v === "3d" ? "3D" : v === "wire" ? "Wire" : "X-Ray"}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Step Panel */}
      {hasSimulation && !isLoading && (
        <div className="md:w-[38%] bg-card border-t md:border-t-0 md:border-l border-subtle flex flex-col">
          {/* Title */}
          <div className="p-6 pb-0">
            <h2 className="text-xl font-semibold text-primary-custom">The Human Heart</h2>
            <p className="text-[13px] text-tertiary-custom mt-1">Interactive 3D Simulation · 6 Steps</p>
          </div>

          {/* Step navigation */}
          <div className="px-6 pt-4 flex items-center justify-between">
            <span className="label-text text-tertiary-custom">
              Step {currentStep + 1} of {demoSteps.length}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="p-1 border border-border rounded-md disabled:opacity-30 hover:bg-background-secondary transition-colors"
              >
                <ChevronLeft size={16} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setCurrentStep(Math.min(demoSteps.length - 1, currentStep + 1))}
                disabled={currentStep === demoSteps.length - 1}
                className="p-1 border border-border rounded-md disabled:opacity-30 hover:bg-background-secondary transition-colors"
              >
                <ChevronRight size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 py-4 px-6">
            {demoSteps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className="h-2 rounded-full transition-all duration-250"
                style={{
                  width: i === currentStep ? 20 : 8,
                  backgroundColor: i === currentStep
                    ? "hsl(var(--accent))"
                    : "hsl(var(--border))",
                }}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="flex-1 overflow-y-auto px-6 animate-fade-in" key={currentStep}>
            <h3 className="text-lg font-semibold text-primary-custom mb-3">{step.title}</h3>
            <p className="text-[15px] text-secondary-custom leading-relaxed">
              {language === "en" ? step.narrationEn : step.narrationHi}
            </p>

            {/* Audio indicator */}
            <div className="flex items-center gap-2 mt-4">
              <div className="flex items-end gap-[2px]">
                {[12, 16, 8].map((h, i) => (
                  <div
                    key={i}
                    className="w-[3px] bg-accent rounded-full"
                    style={{
                      height: isPlaying ? h : 4,
                      transition: "height 300ms ease",
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-tertiary-custom">
                {isPlaying ? (language === "en" ? "Speaking in English" : "हिंदी में बोल रहा है") : "Paused"}
              </span>
            </div>
          </div>

          {/* Playback bar */}
          <div className="p-4 border-t border-subtle flex items-center justify-between">
            <div className="flex rounded-full overflow-hidden border border-border">
              <button
                onClick={() => setLanguage("en")}
                className={`px-3 py-1 text-xs font-medium transition-colors duration-150 ${
                  language === "en" ? "bg-accent text-accent-foreground" : "text-secondary-custom"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage("hi")}
                className={`px-3 py-1 text-xs font-medium transition-colors duration-150 ${
                  language === "hi" ? "bg-accent text-accent-foreground" : "text-secondary-custom"
                }`}
              >
                हिं
              </button>
            </div>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:opacity-90 transition-opacity active:scale-[0.97]"
            >
              {isPlaying ? (
                <Pause size={18} strokeWidth={1.5} className="text-primary-foreground" />
              ) : (
                <Play size={18} strokeWidth={1.5} className="text-primary-foreground ml-0.5" />
              )}
            </button>

            <div className="flex gap-2">
              <Volume2 size={18} strokeWidth={1.5} className="text-tertiary-custom cursor-pointer" />
              <Share2 size={18} strokeWidth={1.5} className="text-tertiary-custom cursor-pointer" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingState({ topic }: { topic: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center relative">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-border overflow-hidden">
        <div className="h-full bg-accent animate-pulse" style={{ width: "60%" }} />
      </div>
      <Atom size={64} strokeWidth={1} className="text-tertiary-custom mb-4 animate-spin" style={{ animationDuration: "3s" }} />
      <p className="text-secondary-custom text-[15px]">Searching for the best model...</p>
      <p className="text-tertiary-custom text-[13px] mt-1">{topic}</p>
    </div>
  );
}

function CanvasContent({ step, language, viewMode }: { step: typeof demoSteps[0]; language: "en" | "hi"; viewMode: string }) {
  return (
    <div className="h-full flex items-center justify-center relative">
      {/* Placeholder for 3D canvas */}
      <div className="w-48 h-48 rounded-full bg-gradient-to-br from-border to-border-subtle flex items-center justify-center">
        <Atom size={80} strokeWidth={0.5} className="text-tertiary-custom" />
      </div>
      {/* Label overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-card/90 border border-border px-4 py-2 rounded-lg shadow-sm animate-fade-in">
        <p className="text-sm font-medium text-primary-custom">{language === "en" ? step.labelEn : step.labelHi}</p>
      </div>
    </div>
  );
}
