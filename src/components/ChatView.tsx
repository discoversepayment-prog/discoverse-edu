import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, Loader2, Trash2, Volume2, Square, ChevronDown } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useStreamChat } from "@/hooks/useStreamChat";
import { useTTS } from "@/hooks/useTTS";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

interface Agent {
  id: string;
  name: string;
  slug: string;
  personality: string;
  greeting_message: string;
  voice_id: string | null;
  knowledge_areas: string[];
}

export function ChatView() {
  const [input, setInput] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const { language } = useApp();
  const { messages, isLoading, send, clear } = useStreamChat();
  const { speak, stop: stopTTS, isSpeaking } = useTTS();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load published agents
  useEffect(() => {
    const loadAgents = async () => {
      const { data } = await supabase.from("ai_agents").select("id, name, slug, personality, greeting_message, voice_id, knowledge_areas").eq("is_published", true);
      if (data && data.length > 0) {
        setAgents(data);
        setSelectedAgent(data[0]);
      }
    };
    loadAgents();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 112) + "px";
    }
  }, [input]);

  const handleSend = (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    send(msg, selectedAgent?.id);
    setInput("");
  };

  const speakMessage = (text: string) => {
    if (isSpeaking) { stopTTS(); return; }
    speak(text, language);
  };

  const hasContent = input.trim().length > 0;
  const greeting = selectedAgent?.greeting_message || "Namaste! 🙏 K sikna chahanchau aaja?";

  return (
    <div className="flex flex-col h-full">
      {/* Agent header */}
      {selectedAgent && (
        <div className="px-3 pt-2 pb-1.5 shrink-0">
          <button
            onClick={() => setShowAgentPicker(!showAgentPicker)}
            className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 w-full"
          >
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-accent" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[13px] font-medium text-primary-custom truncate">{selectedAgent.name}</p>
              <p className="text-[10px] text-tertiary-custom truncate">{selectedAgent.personality}</p>
            </div>
            <ChevronDown size={14} className={`text-tertiary-custom transition-transform ${showAgentPicker ? "rotate-180" : ""}`} />
          </button>

          {showAgentPicker && agents.length > 1 && (
            <div className="mt-1 bg-card border border-border rounded-xl overflow-hidden shadow-lg animate-fade-in">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => { setSelectedAgent(agent); setShowAgentPicker(false); clear(); }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-background-secondary transition-colors ${agent.id === selectedAgent.id ? "bg-accent/5" : ""}`}
                >
                  <Bot size={14} className="text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-primary-custom">{agent.name}</p>
                    <p className="text-[10px] text-tertiary-custom truncate">{agent.knowledge_areas?.join(", ") || "General"}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto px-3 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[45vh] text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                <Bot size={24} className="text-accent" />
              </div>
              <h2 className="text-[17px] font-semibold text-primary-custom mb-1.5">
                {selectedAgent?.name || "Discoverse AI"}
              </h2>
              <p className="text-[13px] text-secondary-custom leading-relaxed max-w-sm mb-6">
                {greeting}
              </p>

              {/* Quick prompts */}
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                {[
                  "Heart kasari kaam garcha?",
                  "DNA structure explain gara",
                  "Solar System ko bare ma batau",
                  "Cell division k ho?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="flex items-center gap-2 px-3.5 py-2.5 bg-card border border-border rounded-xl text-[12px] text-secondary-custom hover:border-accent hover:text-accent transition-all text-left"
                  >
                    <Sparkles size={12} className="shrink-0 text-accent" />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="animate-fade-in">
                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="bg-accent text-accent-foreground px-3.5 py-2 rounded-2xl rounded-br-md max-w-[80%] text-[13px] leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start gap-2">
                      <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-1">
                        <Bot size={12} className="text-accent" />
                      </div>
                      <div className="bg-card border border-border px-3.5 py-2.5 rounded-2xl rounded-bl-md max-w-[85%]">
                        <div className="prose prose-sm max-w-none text-[13px] text-primary-custom leading-relaxed prose-headings:text-primary-custom prose-strong:text-primary-custom prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        {/* TTS button */}
                        {msg.content.length > 20 && (
                          <button
                            onClick={() => speakMessage(msg.content)}
                            className="mt-2 flex items-center gap-1 text-[10px] text-tertiary-custom hover:text-accent transition-colors"
                          >
                            {isSpeaking ? <Square size={10} /> : <Volume2 size={10} />}
                            {isSpeaking ? "Stop" : "Listen"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start gap-2">
                  <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Bot size={12} className="text-accent" />
                  </div>
                  <div className="bg-card border border-border px-3.5 py-2.5 rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-2">
                      <Loader2 size={12} className="animate-spin text-accent" />
                      <span className="text-[11px] text-tertiary-custom">Sochiracha...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pb-16 md:pb-3">
        <div className="max-w-[720px] mx-auto">
          {messages.length > 0 && (
            <div className="flex justify-center mb-1.5">
              <button onClick={clear} className="flex items-center gap-1 text-[10px] text-tertiary-custom hover:text-secondary-custom">
                <Trash2 size={10} /> Clear
              </button>
            </div>
          )}
          <div className="bg-card border border-border rounded-2xl px-3 py-2.5 flex items-end gap-2 shadow-sm">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={selectedAgent ? `Ask ${selectedAgent.name}...` : "Ask anything..."}
              rows={1}
              className="flex-1 resize-none bg-transparent text-[13px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none min-h-[20px] max-h-28 leading-relaxed"
            />
            <button
              onClick={() => handleSend()}
              disabled={!hasContent || isLoading}
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                hasContent && !isLoading ? "bg-accent text-accent-foreground" : "bg-border text-tertiary-custom"
              }`}
            >
              {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} strokeWidth={1.5} />}
            </button>
          </div>
          <p className="text-center text-[9px] text-tertiary-custom mt-1.5 opacity-50">
            {selectedAgent?.name || "Discoverse AI"} · Powered by Lovable Cloud
          </p>
        </div>
      </div>
    </div>
  );
}
