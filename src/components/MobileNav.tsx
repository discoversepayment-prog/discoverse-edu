import { MessageSquare, BookOpen, Clock, User, Shield } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useNavigate, useLocation } from "react-router-dom";

export function MobileNav() {
  const { mode, setMode } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { icon: MessageSquare, label: "Chat", action: () => { setMode("chat"); navigate("/app"); } },
    { icon: BookOpen, label: "Learn", action: () => { setMode("learn"); navigate("/app"); } },
    { icon: Clock, label: "Library", action: () => navigate("/library") },
    { icon: Shield, label: "Admin", action: () => navigate("/admin") },
    { icon: User, label: "Profile", action: () => navigate("/profile") },
  ];

  const getActiveIndex = () => {
    if (location.pathname === "/profile") return items.findIndex(i => i.label === "Profile");
    if (location.pathname === "/library") return items.findIndex(i => i.label === "Library");
    if (location.pathname.startsWith("/admin")) return items.findIndex(i => i.label === "Admin");
    if (mode === "learn" && location.pathname === "/app") return 1;
    return 0;
  };

  const activeIndex = getActiveIndex();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-card/95 backdrop-blur-xl border-t border-border flex items-center justify-around z-50 safe-area-bottom">
      {items.map((item, i) => (
        <button
          key={item.label}
          onClick={item.action}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors duration-150 active:scale-[0.95] ${
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
