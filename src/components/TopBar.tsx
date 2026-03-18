import { Bell, User } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

export function TopBar({ title }: { title?: string }) {
  const { mode, setMode, language, setLanguage } = useApp();

  return (
    <header className="h-14 bg-card border-b border-subtle flex items-center px-4 gap-4 shrink-0">
      {/* Left: title */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-primary-custom truncate">
          {title || "Discoverse"}
        </p>
      </div>

      {/* Center: Mode switcher */}
      <div className="bg-border-subtle rounded-lg p-[3px] flex">
        <button
          onClick={() => setMode("chat")}
          className={`px-4 py-1.5 text-sm rounded-md transition-all duration-150 ${
            mode === "chat"
              ? "bg-card border border-border shadow-sm font-medium text-primary-custom"
              : "text-secondary-custom"
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setMode("learn")}
          className={`px-4 py-1.5 text-sm rounded-md transition-all duration-150 ${
            mode === "learn"
              ? "bg-card border border-border shadow-sm font-medium text-primary-custom"
              : "text-secondary-custom"
          }`}
        >
          Learn
        </button>
      </div>

      {/* Right: Language + bell + avatar */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-full overflow-hidden border border-border">
          <button
            onClick={() => setLanguage("en")}
            className={`px-3 py-1 text-xs font-medium transition-colors duration-150 ${
              language === "en"
                ? "bg-accent text-accent-foreground"
                : "text-secondary-custom"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage("hi")}
            className={`px-3 py-1 text-xs font-medium transition-colors duration-150 ${
              language === "hi"
                ? "bg-accent text-accent-foreground"
                : "text-secondary-custom"
            }`}
          >
            हिं
          </button>
        </div>
        <Bell size={18} strokeWidth={1.5} className="text-tertiary-custom" />
        <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center">
          <User size={16} strokeWidth={1.5} className="text-accent" />
        </div>
      </div>
    </header>
  );
}
