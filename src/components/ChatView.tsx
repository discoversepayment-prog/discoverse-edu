import { useState, useRef, useEffect } from "react";
import { Compass, Send, Sparkles, Paperclip, Atom, Heart, Globe, Cpu } from "lucide-react";

interface Message {
  id: number;
  role: "user" | "ai";
  text: string;
  simulation?: { title: string; subject: string };
}

const suggestions = [
  { icon: Heart, label: "How does the human heart work?" },
  { icon: Atom, label: "DNA Double Helix structure" },
  { icon: Globe, label: "Solar System planets" },
  { icon: Cpu, label: "How does a car engine work?" },
];

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now(), role: "user", text: input };
    const aiMsg: Message = {
      id: Date.now() + 1,
      role: "ai",
      text: `Great question! Let me help you explore "${input}" with an interactive 3D experience. I found a relevant model in our database and I'm preparing your simulation now.`,
      simulation: { title: input, subject: "Biology" },
    };
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput("");
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
    setTimeout(() => {
      const userMsg: Message = { id: Date.now(), role: "user", text };
      const aiMsg: Message = {
        id: Date.now() + 1,
        role: "ai",
        text: `Excellent topic! "${text}" is one of the most fascinating subjects. Let me prepare an interactive 3D simulation for you with step-by-step narration.`,
        simulation: { title: text, subject: "Science" },
      };
      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setInput("");
    }, 100);
  };

  const hasContent = input.trim().length > 0;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-y-auto px-4 md:px-0">
        <div className="max-w-2xl mx-auto py-8">
          {messages.length === 0 ? (
            <EmptyState onSuggestion={handleSuggestion} />
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="animate-fade-in">
                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="bg-accent text-accent-foreground px-4 py-3 rounded-xl rounded-br-sm max-w-[70%] text-[15px]">
                        {msg.text}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className="bg-card border border-border px-4 py-3 rounded-xl rounded-bl-sm max-w-[80%]">
                        <p className="text-[15px] text-primary-custom leading-relaxed">{msg.text}</p>
                        {msg.simulation && (
                          <SimulationCard title={msg.simulation.title} subject={msg.simulation.subject} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div className="px-4 pb-4 md:pb-6 pb-20 md:pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border border-border rounded-xl shadow-sm px-4 py-3 flex items-end gap-3">
            <Paperclip size={18} strokeWidth={1.5} className="text-tertiary-custom mb-1 shrink-0 cursor-pointer hover:text-secondary-custom transition-colors" />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder="Ask anything about science..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-[15px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none min-h-[24px] max-h-32"
            />
            <Sparkles size={18} strokeWidth={1.5} className="text-accent mb-1 shrink-0 cursor-pointer" />
            <button
              onClick={sendMessage}
              disabled={!hasContent}
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150 ${
                hasContent
                  ? "bg-accent text-accent-foreground"
                  : "bg-border text-tertiary-custom"
              }`}
            >
              <Send size={16} strokeWidth={1.5} />
            </button>
          </div>
          <p className="text-center text-[11px] text-tertiary-custom mt-2">
            Discoverse can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Compass size={48} strokeWidth={1.5} className="text-border mb-6" />
      <h2 className="text-xl font-semibold text-primary-custom mb-2">
        Explore any topic in 3D
      </h2>
      <p className="text-secondary-custom text-[15px] mb-8 max-w-md">
        Ask a question about science, biology, physics, or any educational topic and get an interactive 3D experience.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => onSuggestion(s.label)}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-sm text-secondary-custom hover:border-accent hover:text-accent transition-colors duration-150"
          >
            <s.icon size={16} strokeWidth={1.5} />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SimulationCard({ title, subject }: { title: string; subject: string }) {
  return (
    <div className="mt-3 border border-border rounded-xl overflow-hidden">
      <div className="h-[180px] bg-canvas flex items-center justify-center">
        <div className="text-center">
          <Atom size={40} strokeWidth={1.5} className="text-tertiary-custom mx-auto mb-2" />
          <p className="text-sm text-tertiary-custom">{subject} · 3D Model</p>
        </div>
      </div>
      <div className="p-3 flex gap-2">
        <button className="flex-1 bg-accent text-accent-foreground text-sm font-medium py-2 rounded-lg hover:opacity-90 transition-opacity duration-150">
          View in 3D
        </button>
        <button className="flex-1 border border-border text-secondary-custom text-sm font-medium py-2 rounded-lg hover:bg-background-secondary transition-colors duration-150">
          Add to Library
        </button>
      </div>
    </div>
  );
}
