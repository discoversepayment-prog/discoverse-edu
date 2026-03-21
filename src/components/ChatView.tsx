import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, Loader2, Trash2, Volume2, Square, ChevronDown, Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
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
  created_by: string | null;
  avatar_url: string | null;
}

export function ChatView() {
  const [input, setInput] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAgentList, setShowAgentList] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { language } = useApp();
  const { user } = useAuth();
  const { messages, isLoading, send, clear, pastConversations, loadConversations, resumeConversation } = useStreamChat();
  const { speak, stop: stopTTS, isSpeaking } = useTTS();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadAgents = async () => {
      const { data } = await supabase
        .from("ai_agents")
        .select("id, name, slug, personality, greeting_message, voice_id, knowledge_areas, created_by, avatar_url")
        .eq("is_published", true);
      if (data && data.length > 0) setAgents(data);
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

  const selectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowAgentList(false);
    clear();
    if (user) loadConversations(agent.id);
  };

  const backToAgents = () => {
    setSelectedAgent(null);
    setShowAgentList(true);
    clear();
  };

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

  const filteredAgents = agents.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.knowledge_areas || []).some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ── Agent Grid View (Mobile-first) ──
  if (showAgentList && !selectedAgent) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-4 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[18px] font-bold text-primary-custom">AI Agents</h2>
            <button
              onClick={() => navigate("/create-agent")}
              className="flex items-center gap-1 bg-accent text-accent-foreground px-3 py-1.5 rounded-lg text-[11px] font-medium hover:opacity-90 active:scale-[0.97] transition-all"
            >
              <Plus size={12} /> Create
            </button>
          </div>
          <p className="text-[12px] text-tertiary-custom mb-3">Specialized AI built by creators</p>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary-custom" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents..."
              className="w-full bg-card border border-border rounded-xl h-9 pl-9 pr-3 text-[13px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-20 md:pb-4">
          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Bot size={36} strokeWidth={1} className="text-border mb-3" />
              <p className="text-[14px] text-secondary-custom">No agents available yet</p>
              <p className="text-[12px] text-tertiary-custom mt-1">Be the first to create one!</p>
              <button
                onClick={() => navigate("/create-agent")}
                className="mt-4 flex items-center gap-1.5 bg-accent text-accent-foreground px-4 py-2 rounded-xl text-[12px] font-medium active:scale-[0.97]"
              >
                <Sparkles size={14} /> Create Agent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {filteredAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => selectAgent(agent)}
                  className="bg-card border border-border rounded-2xl p-3 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group flex flex-col"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 mb-2.5 overflow-hidden">
                    {agent.avatar_url ? (
                      <img src={agent.avatar_url} alt={agent.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Bot size={20} className="text-accent" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <h3 className="text-[13px] font-semibold text-primary-custom group-hover:text-accent transition-colors truncate">
                      {agent.name}
                    </h3>
                    {agent.created_by === user?.id && (
                      <span className="text-[8px] bg-accent/10 text-accent px-1 py-0.5 rounded-full font-medium shrink-0">you</span>
                    )}
                  </div>
                  <p className="text-[10px] text-secondary-custom line-clamp-2 leading-relaxed">{agent.personality}</p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {(agent.knowledge_areas || []).slice(0, 2).map((area) => (
                      <span key={area} className="text-[9px] bg-background-secondary text-tertiary-custom px-1.5 py-0.5 rounded-full">
                        {area}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Chat with Agent View ──
  const hasContent = input.trim().length > 0;
  const greeting = selectedAgent?.greeting_message || "Namaste! K sikna chahanchau?";

  return (
    <div className="flex flex-col h-full">
      {/* Agent header */}
      {selectedAgent && (
        <div className="px-3 pt-2 pb-1.5 shrink-0">
          <button
            onClick={backToAgents}
            className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 w-full active:scale-[0.98] transition-transform"
          >
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 overflow-hidden">
              {selectedAgent.avatar_url ? (
                <img src={selectedAgent.avatar_url} alt="" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Bot size={14} className="text-accent" />
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[13px] font-medium text-primary-custom truncate">{selectedAgent.name}</p>
              <p className="text-[10px] text-tertiary-custom truncate">{selectedAgent.personality}</p>
            </div>
            <ChevronDown size={14} className="text-tertiary-custom rotate-90" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto px-3 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[45vh] text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 overflow-hidden">
                {selectedAgent?.avatar_url ? (
                  <img src={selectedAgent.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Bot size={24} className="text-accent" />
                )}
              </div>
              <h2 className="text-[17px] font-semibold text-primary-custom mb-1.5">
                {selectedAgent?.name || "Discoverse AI"}
              </h2>
              <p className="text-[13px] text-secondary-custom leading-relaxed max-w-sm mb-6">
                {greeting}
              </p>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                {["Explain photosynthesis", "DNA structure k ho?", "Solar System bare batau", "Quantum physics basics"].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="flex items-center gap-2 px-3.5 py-2.5 bg-card border border-border rounded-xl text-[12px] text-secondary-custom hover:border-accent hover:text-accent transition-all text-left active:scale-[0.97]"
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
                      <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-1 overflow-hidden">
                        {selectedAgent?.avatar_url ? (
                          <img src={selectedAgent.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Bot size={12} className="text-accent" />
                        )}
                      </div>
                      <div className="bg-card border border-border px-3.5 py-2.5 rounded-2xl rounded-bl-md max-w-[85%]">
                        <div className="prose prose-sm max-w-none text-[13px] text-primary-custom leading-relaxed prose-headings:text-primary-custom prose-strong:text-primary-custom prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        {msg.content.length > 20 && (
                          <button
                            onClick={() => speakMessage(msg.content)}
                            className="mt-2 flex items-center gap-1 text-[10px] text-tertiary-custom hover:text-accent transition-colors active:scale-[0.95]"
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
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-tertiary-custom"
                          style={{
                            animation: "pulse-dot 1.2s ease-in-out infinite",
                            animationDelay: `${i * 200}ms`,
                          }}
                        />
                      ))}
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
      <div className="px-3 pb-16 md:pb-3">
        <div className="max-w-[720px] mx-auto">
          {messages.length > 0 && (
            <div className="flex justify-center mb-1.5">
              <button onClick={() => { clear(); backToAgents(); }} className="flex items-center gap-1 text-[10px] text-tertiary-custom hover:text-secondary-custom active:scale-[0.95]">
                <Trash2 size={10} /> New Chat
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
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all active:scale-[0.95] ${
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
