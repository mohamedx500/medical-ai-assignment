"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, Sparkles, Plus, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export default function ChatPage() {
  const { t, locale } = useI18n();
  const { token } = useAuth();

  const getInitialMessage = (): Message => ({
    id: "1",
    role: "assistant",
    content: locale === "ar"
      ? "مرحباً! أنا MedAI، مساعدك الطبي الذكي. كيف يمكنني مساعدتك اليوم؟"
      : "Hello! I'm MedAI, your medical AI assistant. How can I help you today?",
    timestamp: new Date(),
  });

  const [messages, setMessages] = useState<Message[]>([getInitialMessage()]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchSessions = async () => {
    if (!token) return;
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/chat/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error("Failed to fetch sessions", e);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [token]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([getInitialMessage()]);
  };

  const loadSession = async (id: number) => {
    if (!token) return;
    setSessionId(id);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/chat/sessions/${id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped: Message[] = data.messages.map((m: any) => ({
          id: m.id.toString(),
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at)
        }));
        setMessages(mapped);
      }
    } catch (e) {
      console.error("Failed to load session", e);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${API}/api/chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: userMsg.content,
          session_id: sessionId,
          history,
          language: locale,
        }),
      });

      let reply: string;

      if (res.ok) {
        const data = await res.json();
        reply = data.reply || (locale === "ar" ? "تم استلام رسالتك." : "Message received.");
        if (data.session_id) {
          setSessionId(data.session_id);
          fetchSessions(); // Refresh list to show new session
        }
      } else {
        const err = await res.json().catch(() => null);
        const detail = err?.detail;
        const errorMsg =
          typeof detail === "object" ? detail.message : detail || `Server error (${res.status})`;
        console.error("[Chat] API error:", errorMsg);
        reply = `⚠️ ${errorMsg}`;
      }

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: reply, timestamp: new Date() },
      ]);
    } catch (err) {
      console.error("[Chat] Network error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: locale === "ar"
            ? "تعذر الاتصال بالخادم. تأكد من تشغيل الخادم."
            : "Unable to reach the AI server. Make sure the backend is running on port 8000.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .split("\n")
      .map((line, i) => {
        if (line.startsWith("**") && line.endsWith("**")) {
          return <p key={i} className="font-semibold">{line.replace(/\*\*/g, "")}</p>;
        }
        if (line.startsWith("• ") || line.startsWith("- ")) {
          return <p key={i} className="pl-3">{line}</p>;
        }
        return <p key={i}>{line || "\u00A0"}</p>;
      });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* ── Header ── */}
      <div className="mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t("aiAssistant")}</h1>
          <p className="text-xs text-muted-foreground">{t("poweredByGemini")}</p>
        </div>
      </div>

      <div className="flex h-[calc(100vh-8rem)] w-full rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* ── Chat History Sidebar ── */}
        <div className="hidden md:flex w-72 flex-shrink-0 flex-col border-e border-border bg-muted/30">
          <div className="p-4 border-b border-border">
            <Button onClick={handleNewChat} className="w-full justify-start gap-2 shadow-sm" variant="outline">
              <Plus className="w-4 h-4" /> {locale === "ar" ? "محادثة جديدة" : "New Chat"}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => loadSession(session.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                  session.id === sessionId
                    ? "bg-muted dark:bg-zinc-800 text-foreground"
                    : "hover:bg-muted/50 text-muted-foreground"
                )}
              >
                <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                <span className="truncate flex-1 text-sm font-medium">{session.title}</span>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-xs text-center text-muted-foreground mt-4 px-4">
                {locale === "ar" ? "لا توجد محادثات سابقة." : "No previous chats."}
              </p>
            )}
          </div>
        </div>

        {/* ── Chat Area ── */}
        <div className="flex-1 flex flex-col bg-background">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 max-w-[75%]",
                  msg.role === "user" ? "self-end ms-auto flex-row-reverse" : "self-start",
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground shadow-primary/20"
                      : "bg-muted border border-border",
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4 text-foreground/80" />
                  )}
                </div>

                <div
                  className={cn(
                    "px-4 py-2 text-sm leading-relaxed rounded-2xl",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm",
                  )}
                >
                  {formatContent(msg.content)}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-3 max-w-[75%] self-start">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-foreground/80" />
                </div>
                <div className="bg-muted text-foreground px-4 py-2 rounded-2xl rounded-tl-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input Area ── */}
          <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-end gap-3 w-full">
              <Textarea
                ref={textareaRef}
                placeholder={t("typeMessage")}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className="flex-1 resize-none min-h-[44px] max-h-[150px] text-sm rounded-xl border-border focus-visible:ring-primary/50 shadow-sm bg-background"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                size="icon"
                className="h-11 w-11 rounded-xl shrink-0 transition-all hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
