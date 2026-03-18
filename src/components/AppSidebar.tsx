import { Compass, MessageSquare, BookOpen, Clock, Settings, User } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useLocation, useNavigate } from "react-router-dom";

const recentConversations = [
  "How does the human heart work?",
  "DNA Double Helix structure",
  "Solar System planets",
  "हृदय कैसे काम करता है",
  "Car Engine mechanics",
];

export function AppSidebar() {
  const { mode, setMode } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith("/admin");

  const handleNav = (target: "chat" | "learn") => {
    setMode(target);
    if (location.pathname !== "/") navigate("/");
  };

  return (
    <aside className="hidden md:flex flex-col w-60 bg-background-secondary border-r border-border shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 pb-2">
        <div className="flex items-center gap-2">
          <Compass className="text-accent" size={22} strokeWidth={1.5} />
          <span className="text-lg font-semibold text-primary-custom">Discoverse</span>
        </div>
        <p className="text-tertiary-custom text-xs mt-1">Good morning, Explorer</p>
      </div>

      {/* Navigation */}
      <nav className="px-3 mt-4 space-y-1">
        <button
          onClick={() => handleNav("chat")}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
            mode === "chat" && !isAdmin
              ? "bg-accent-subtle text-accent border-l-2 border-accent font-medium"
              : "text-secondary-custom hover:bg-border-subtle"
          }`}
        >
          <MessageSquare size={18} strokeWidth={1.5} />
          Chat
        </button>
        <button
          onClick={() => handleNav("learn")}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
            mode === "learn" && !isAdmin
              ? "bg-accent-subtle text-accent border-l-2 border-accent font-medium"
              : "text-secondary-custom hover:bg-border-subtle"
          }`}
        >
          <BookOpen size={18} strokeWidth={1.5} />
          Learn
        </button>
        <button
          onClick={() => navigate("/library")}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
            location.pathname === "/library"
              ? "bg-accent-subtle text-accent border-l-2 border-accent font-medium"
              : "text-secondary-custom hover:bg-border-subtle"
          }`}
        >
          <Clock size={18} strokeWidth={1.5} />
          Library
        </button>
      </nav>

      {/* Recent */}
      <div className="px-3 mt-6">
        <p className="label-text text-tertiary-custom px-3 mb-2">Recent</p>
        <div className="space-y-0.5">
          {recentConversations.map((title, i) => (
            <button
              key={i}
              className="w-full text-left px-3 py-1.5 text-[13px] text-secondary-custom truncate rounded-md hover:bg-border-subtle transition-colors duration-150"
            >
              {title}
            </button>
          ))}
        </div>
      </div>

      {/* Admin link */}
      <div className="px-3 mt-4">
        <button
          onClick={() => navigate("/admin")}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
            isAdmin
              ? "bg-accent-subtle text-accent border-l-2 border-accent font-medium"
              : "text-secondary-custom hover:bg-border-subtle"
          }`}
        >
          <Settings size={18} strokeWidth={1.5} />
          Admin
        </button>
      </div>

      {/* User */}
      <div className="mt-auto p-4 border-t border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center">
          <User size={16} strokeWidth={1.5} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary-custom truncate">Student</p>
        </div>
        <Settings size={16} strokeWidth={1.5} className="text-tertiary-custom" />
      </div>
    </aside>
  );
}
