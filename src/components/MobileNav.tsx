import { MessageSquare, BookOpen, Clock, User } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useNavigate, useLocation } from "react-router-dom";

export function MobileNav() {
  const { mode, setMode } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { icon: MessageSquare, label: "Chat", action: () => { setMode("chat"); navigate("/"); } },
    { icon: BookOpen, label: "Learn", action: () => { setMode("learn"); navigate("/"); } },
    { icon: Clock, label: "Library", action: () => navigate("/library") },
    { icon: User, label: "Profile", action: () => {} },
  ];

  const activeIndex = location.pathname === "/library" ? 2 : mode === "learn" ? 1 : 0;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-card border-t border-border flex items-center justify-around z-50">
      {items.map((item, i) => (
        <button
          key={item.label}
          onClick={item.action}
          className={`flex flex-col items-center gap-0.5 text-xs transition-colors duration-150 ${
            activeIndex === i ? "text-accent" : "text-tertiary-custom"
          }`}
        >
          <item.icon size={20} strokeWidth={1.5} />
          {item.label}
        </button>
      ))}
    </nav>
  );
}
