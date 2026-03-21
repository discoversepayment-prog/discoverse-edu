import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export function useStreamChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pastConversations, setPastConversations] = useState<any[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const { user } = useAuth();

  // Load past conversations for an agent
  const loadConversations = useCallback(async (agentId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from("conversation_history")
      .select("id, title, updated_at, messages")
      .eq("user_id", user.id)
      .eq("agent_id", agentId)
      .order("updated_at", { ascending: false })
      .limit(20);
    setPastConversations(data || []);
  }, [user]);

  // Resume a past conversation
  const resumeConversation = useCallback((conv: any) => {
    setConversationId(conv.id);
    const msgs = (conv.messages || []).map((m: any) => ({
      id: m.id || crypto.randomUUID(),
      role: m.role,
      content: m.content,
    }));
    setMessages(msgs);
  }, []);

  // Save conversation to DB
  const saveConversation = useCallback(async (msgs: ChatMessage[], agentId?: string) => {
    if (!user || !agentId || msgs.length < 2) return;
    const title = msgs[0]?.content?.slice(0, 80) || "Chat";
    const jsonMsgs = msgs.map(m => ({ id: m.id, role: m.role, content: m.content }));

    if (conversationId) {
      await supabase.from("conversation_history")
        .update({ messages: jsonMsgs as any, title })
        .eq("id", conversationId);
    } else {
      const { data } = await supabase.from("conversation_history")
        .insert({ user_id: user.id, agent_id: agentId, messages: jsonMsgs as any, title })
        .select("id")
        .single();
      if (data) setConversationId(data.id);
    }
  }, [user, conversationId]);

  const send = useCallback(async (input: string, agentId?: string) => {
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: input };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let assistantContent = "";
    const assistantId = crypto.randomUUID();

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          agentId,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx: number;
        while ((nlIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && last.id === assistantId) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { id: assistantId, role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Save after complete response
      const finalMessages = [...allMessages, { id: assistantId, role: "assistant" as const, content: assistantContent }];
      saveConversation(finalMessages, agentId);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("Chat error:", e);
        setMessages(prev => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: `Maaf garnus, error aayo: ${e.message}` },
        ]);
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, saveConversation]);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsLoading(false);
    setConversationId(null);
  }, []);

  return { messages, isLoading, send, clear, pastConversations, loadConversations, resumeConversation };
}
