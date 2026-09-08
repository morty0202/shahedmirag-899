import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { chatWithAssistant } from "../lib/api/assistant";
import {
  appendMessage,
  createConversation,
  deleteConversation,
  listConversations,
  type ChatConversation,
} from "../lib/api/chatHistory";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const suggestions = [
  "خلاصه فصل ۵ ریاضی را بنویس",
  "قوانین حرکت نیوتن را توضیح بده",
  "برنامه مطالعه هفتگی پیشنهاد بده",
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot h-1.5 w-1.5 rounded-full bg-aurora-400"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  );
}

export default function Assistant() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = !!user;

  const loadConversations = async () => {
    try {
      const data = await listConversations();
      setConversations(data);
    } catch (err) {
      console.error("[Assistant] loadConversations failed:", err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const startNewConversation = async () => {
    if (!isLoggedIn) {
      showError("برای استفاده از تاریخچه، لطفاً وارد شوید");
      return;
    }
    try {
      const result = await createConversation("گفتگوی جدید");
      console.log("[Assistant] startNewConversation success:", result);
      setActiveConversationId(result.data.id);
      setMessages([
        {
          role: "assistant",
          text: "سلام! من دستیار آموزشی مدرسه شاهد معراج هستم. درباره درس‌ها، جزوات یا برنامه مطالعه از من بپرسید.",
        },
      ]);
      await loadConversations();
      setSidebarOpen(false);
      setError(null);
    } catch (err) {
      console.error("[Assistant] startNewConversation failed:", err);
      showError("خطا در ساخت گفتگوی جدید. لطفاً دوباره تلاش کنید.");
    }
  };

  const loadConversation = async (id: string) => {
    if (!isLoggedIn) return;
    try {
      const data = await getConversation(id);
      setActiveConversationId(id);
      setMessages(data.messages.map((m: { role: string; content: string }) => ({ role: m.role, text: m.content })));
      setSidebarOpen(false);
      setError(null);
    } catch (err) {
      console.error("[Assistant] loadConversation failed:", err);
      showError("خطا در بارگذاری گفتگو");
    }
  };

  const getConversation = async (id: string) => {
    const token = localStorage.getItem("sm_token") || localStorage.getItem("token") || "";
    const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/chat/conversations/${id}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error("not_found");
    return res.json();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!isLoggedIn) return;
    if (!confirm("آیا از حذف این گفتگو اطمینان دارید؟")) return;
    try {
      await deleteConversation(id);
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
      await loadConversations();
      setError(null);
    } catch (err) {
      console.error("[Assistant] handleDelete failed:", err);
      showError("خطا در حذف گفتگو");
    }
  };

  const handleTitleSave = async (id: string) => {
    if (!editTitle.trim() || !isLoggedIn) return;
    try {
      await updateConversationTitle(id, editTitle.trim());
      setEditingTitleId(null);
      await loadConversations();
      setError(null);
    } catch (err) {
      console.error("[Assistant] handleTitleSave failed:", err);
      showError("خطا در ویرایش عنوان");
    }
  };

  const updateConversationTitle = async (id: string, title: string) => {
    const token = localStorage.getItem("sm_token") || localStorage.getItem("token") || "";
    const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/chat/conversations/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error("update_failed");
    return res.json();
  };

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || typing) return;

    const history = messages
      .filter((m) => m !== messages[0])
      .map((m) => ({ role: m.role, content: m.text }));

    const userMsg = { role: "user" as const, text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    setError(null);

    let conversationId = activeConversationId;

    if (!conversationId && isLoggedIn) {
      try {
        const result = await createConversation(text.slice(0, 50) || "گفتگوی جدید");
        conversationId = result.data.id;
        setActiveConversationId(conversationId);
        await loadConversations();
      } catch {
        // اگر ساخت گفتگو شکست خورد، چت بدون تاریخچه ادامه می‌دهد
        conversationId = null;
      }
    }

    if (conversationId) {
      try {
        await appendMessage(conversationId, { role: "user", content: text });
      } catch {
        // ignore
      }
    }

    try {
      const reply = await chatWithAssistant(text, history);
      setMessages((m) => [...m, { role: "assistant", text: reply }]);

      if (conversationId) {
        try {
          await appendMessage(conversationId, { role: "assistant", content: reply, source: "ai" });
          if (messages.length <= 1) {
            await updateConversationTitle(conversationId, text.slice(0, 50));
            await loadConversations();
          }
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error("[Assistant] chatWithAssistant failed:", err);
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "اتصال به دستیار برقرار نشد؛ چند لحظه بعد دوباره تلاش کنید." },
      ]);
      showError("خطا در ارتباط با دستیار");
    } finally {
      setTyping(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send();
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    if (conversations.length === 0) return;
    if (!activeConversationId && conversations.length > 0) {
      loadConversation(conversations[0].id);
    }
  }, [conversations]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Intro */}
      <section className="glass anim-fade-up rounded-3xl p-6">
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-aurora-500 to-aurora-700 text-white shadow-[0_10px_28px_-12px_color-mix(in_srgb,var(--color-aurora-500)_60%,transparent)]">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="absolute -bottom-1 -left-1 h-3.5 w-3.5 rounded-full border-2 border-card2 bg-aurora-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[17px] font-extrabold text-ink">دستیار هوشمند آموزشی</h1>
              <span className="rounded-full border border-line bg-aurora-500/8 px-2.5 py-0.5 text-[10.5px] font-bold text-ink2">
                فعال
              </span>
            </div>
            <p className="mt-1 text-[12.5px] leading-6 text-ink3">
              راهنمای درسی مدرسه برای رفع ابهام‌ها، مرور جزوات و برنامه‌ریزی مطالعه — همیشه در کنار شما.
            </p>
          </div>
        </div>
      </section>

      {/* Main Chat Area */}
      <section className="glass anim-fade-up rounded-3xl overflow-hidden" style={{ animationDelay: "80ms" }}>
        {error && (
          <div className="border-b border-line bg-error/10 px-4 py-3 text-[12px] font-bold text-error">
            {error}
          </div>
        )}
        <div className="flex items-stretch">
          {/* Sidebar - Conversation History */}
          {isLoggedIn && (
            <div className={`${sidebarOpen ? "w-72" : "w-0"} border-l border-line transition-all duration-300 overflow-hidden`}>
              <div className="flex h-full w-72 flex-col">
                <div className="border-b border-line p-3">
                  <button
                    onClick={startNewConversation}
                    className="btn btn-primary btn-sm w-full"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    گفتگوی جدید
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {conversations.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => loadConversation(c.id)}
                      className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${
                        activeConversationId === c.id
                          ? "bg-aurora-500/10 text-aurora-500"
                          : "hover:bg-aurora-500/5 text-ink"
                      }`}
                    >
                      <svg className="h-4 w-4 shrink-0 text-ink3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                      </svg>
                      <div className="min-w-0 flex-1">
                        {editingTitleId === c.id ? (
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={() => handleTitleSave(c.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleTitleSave(c.id);
                              if (e.key === "Escape") setEditingTitleId(null);
                            }}
                            className="w-full bg-transparent text-[12px] font-bold text-ink outline-none"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <p className="truncate text-[12px] font-bold">{c.title}</p>
                        )}
                        <p className="truncate text-[10px] text-ink3">{new Date(c.updatedAt).toLocaleDateString("fa-IR")}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTitleId(c.id);
                            setEditTitle(c.title);
                          }}
                          className="btn btn-icon btn-sm"
                          title="ویرایش عنوان"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, c.id)}
                          className="btn btn-icon btn-sm hover:!bg-error/10 hover:!text-error"
                          title="حذف"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.061-.94-1.75-1.839-1.75h-7.5c-.899 0-1.839.689-1.839 1.75v.916" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {conversations.length === 0 && (
                    <p className="px-3 py-4 text-center text-[11px] text-ink3">هنوز گفتگویی ثبت نشده است</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Chat Area */}
          <div className="flex-1">
            {/* Sidebar Toggle */}
            {isLoggedIn && (
              <div className="border-b border-line px-4 py-3 flex items-center justify-between">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="btn btn-icon btn-sm"
                  title={sidebarOpen ? "مخفی کردن تاریخچه" : "نمایش تاریخچه"}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </button>
                <button
                  onClick={startNewConversation}
                  className="btn btn-ghost btn-sm"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                  گفتگوی جدید
                </button>
              </div>
            )}

            {/* Messages */}
            <div
              ref={scrollRef}
              className="no-scrollbar h-[340px] space-y-4 overflow-y-auto px-4 py-3"
              aria-live="polite"
            >
              {messages.map((m, i) =>
                m.role === "assistant" ? (
                  <div key={i} className="msg-in flex items-end gap-2.5">
                    <img
                      src="/icon.jpg"
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-line"
                    />
                    <div className="max-w-[82%] rounded-2xl rounded-br-md border border-line bg-card2/70 px-4 py-3 text-[13px] leading-7 text-ink2">
                      {m.text}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="msg-in flex justify-end">
                    <div className="max-w-[82%] rounded-2xl rounded-bl-md bg-gradient-to-br from-aurora-500 to-aurora-700 px-4 py-3 text-[13px] leading-7 text-white shadow-[0_8px_22px_-12px_rgba(79,70,229,0.7)]">
                      {m.text}
                    </div>
                  </div>
                )
              )}

              {typing && (
                <div className="msg-in flex items-end gap-2.5">
                  <img src="/icon.jpg" alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-line" />
                  <div className="rounded-2xl rounded-br-md border border-line bg-card2/70 px-3.5 py-3">
                    <TypingDots />
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions */}
            <div className="mt-3 flex flex-wrap gap-2 px-4">
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={typing}
                  className="anim-fade-up press rounded-full border border-line bg-aurora-500/5 px-3.5 py-1.5 text-[11.5px] font-semibold text-ink2 transition-colors hover:border-aurora-500/40 hover:text-aurora-500 disabled:opacity-50"
                  style={{ animationDelay: `${120 + i * 70}ms` }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={onSubmit}
              className="mx-4 mb-4 mt-3 flex items-center gap-2 rounded-2xl border border-line bg-card2/60 p-2 transition-colors focus-within:border-aurora-500/50"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="پرسش درسی خود را بنویسید..."
                className="h-9 flex-1 bg-transparent px-2.5 text-[13px] text-ink placeholder:text-ink3 outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || typing}
                aria-label="ارسال پرسش"
                className="press flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-aurora-500 to-aurora-700 text-white shadow-md shadow-aurora-600/30 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                <svg className="h-4.5 w-4.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
