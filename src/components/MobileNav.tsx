import { BookOpen, Clock, User, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

export function MobileNav() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { icon: BookOpen, label: "Learn", action: () => navigate("/app"), show: true },
    { icon: Clock, label: "Library", action: () => navigate("/library"), show: true },
    { icon: Shield, label: "Admin", action: () => navigate("/wedisni"), show: isAdmin },
    { icon: User, label: "Profile", action: () => navigate("/profile"), show: true },
  ].filter(i => i.show);

  const getActiveIndex = () => {
    if (location.pathname === "/profile") return items.findIndex(i => i.label === "Profile");
    if (location.pathname === "/library") return items.findIndex(i => i.label === "Library");
    if (location.pathname.startsWith("/wedisni")) return items.findIndex(i => i.label === "Admin");
    return 0;
  };

  const activeIndex = getActiveIndex();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-xl border-t border-border flex items-center justify-around z-50 safe-area-bottom">
      {items.map((item, i) => (
        <button
          key={item.label}
          onClick={item.action}
          className={`flex flex-col items-center gap-0.5 text-[9px] font-medium transition-all duration-150 active:scale-[0.92] ${
            activeIndex === i ? "text-primary-custom" : "text-tertiary-custom"
          }`}
        >
          <item.icon size={18} strokeWidth={activeIndex === i ? 2 : 1.5} />
          {item.label}
        </button>
      ))}
    </nav>
  );
}
