import { Logo } from "@/components/Logo";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";

export function TopBar({ title }: { title?: string }) {
  const { mode, setMode, language, setLanguage } = useApp();
  const { user } = useAuth();
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <header className="h-12 bg-background border-b border-border flex items-center px-4 md:px-5 gap-3 shrink-0">
      <div className="md:hidden">
        <Logo size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-primary-custom tracking-tight truncate">{title || "Discoverse"}</p>
      </div>

      <div className="bg-secondary rounded-lg p-[2px] flex">
        {(["chat", "learn"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1 text-[11px] rounded-md transition-all duration-200 capitalize font-medium tracking-wide ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "text-tertiary-custom hover:text-primary-custom"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-md overflow-hidden border border-border h-6">
          {(["en", "hi"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              className={`px-2 text-[10px] font-medium transition-colors duration-150 ${
                language === l ? "bg-primary text-primary-foreground" : "text-tertiary-custom hover:text-primary-custom"
              }`}
            >
              {l === "en" ? "EN" : "हिं"}
            </button>
          ))}
        </div>
        {avatarUrl ? (
          <img src={avatarUrl} className="w-6 h-6 rounded-full object-cover ring-1 ring-border" alt="" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-[10px] font-bold text-tertiary-custom">
              {user?.email?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
