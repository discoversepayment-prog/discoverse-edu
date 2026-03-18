import { createContext, useContext, useState, ReactNode } from "react";

type AppMode = "chat" | "learn";
type Language = "en" | "hi";

interface AppContextType {
  mode: AppMode;
  setMode: (m: AppMode) => void;
  language: Language;
  setLanguage: (l: Language) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>("chat");
  const [language, setLanguage] = useState<Language>("en");

  return (
    <AppContext.Provider value={{ mode, setMode, language, setLanguage }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
