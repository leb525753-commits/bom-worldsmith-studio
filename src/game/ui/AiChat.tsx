import { Hammer, Key, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, type PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { StudioButton } from "@/components/studio/StudioButton";
import { supabase } from "@/integrations/supabase/client";
import bomAi from "@/assets/bom-ai.jpg";
import { freeReply } from "../aiFree";
import { codeLabel } from "../catalog";
import { aiMapObjects } from "../sim/aiMap";
import { useStudio } from "../store";

type ToolState = "input-streaming" | "input-available" | "output-available" | "output-error";
interface ToolCall {
  id: string;
  state: ToolState;
  input?: unknown;
  output?: { added: number; cleared: boolean };
  error?: string;
}
interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  text: string;
  tools: ToolCall[];
}
type Status = "ready" | "submitted" | "streaming" | "error";

const SUGGESTIONS = ["Xây một ngôi làng có đường và cây táo", "Làm đường đua parkour bằng part", "Cách làm quái vật đuổi người chơi?"];

const uid = () => Math.random().toString(36).slice(2, 10);

function sceneSummary(): string {
  const objs = useStudio.getState().project?.objects ?? [];
  if (objs.length === 0) return "";
  const counts = new Map<string, number>();
  for (const o of objs) counts.set(codeLabel(o), (counts.get(codeLabel(o)) ?? 0) + 1);
  return `${objs.length} vật thể: ${[...counts].map(([k, n]) => `${n} ${k}`).join(", ")}`;
}

const historyText = (m: ChatMsg) =>
  [m.text, ...m.tools.filter((t) => t.output).map((t) => `(Đã xây map: ${t.output!.added} vật thể)`)].filter(Boolean).join("\n") || "(trống)";

export function AiChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [status, setStatus] = useState<Status>("ready");
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Quản lý API Key riêng của người chơi trong máy (localStorage)
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [savedKey, setSavedKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("bom_custom_gemini_key") || "";
  });
  const [apiKeyInput, setApiKeyInput] = useState(savedKey);

  const focusInput = useCallback(() => boxRef.current?.querySelector("textarea")?.focus(), []);
  useEffect(() => {
    focusInput();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => {
      window.removeEventListener("keydown", k);
      abortRef.current?.abort();
    };
  }, [focusInput, onClose]);

  const patchLast = (fn: (m: ChatMsg) => ChatMsg) =>
    setMessages((list) => (list.length ? [...list.slice(0, -1), fn(list[list.length - 1]!)] : list));

  const handleSaveKey = () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      localStorage.setItem("bom_custom_gemini_key", trimmed);
      setSavedKey(trimmed);
    } else {
      localStorage.removeItem("bom_custom_gemini_key");
      setSavedKey("");
    }
    setShowKeyDialog(false);
  };

  const applyBuild = (callId: string, rawArgs: string) => {
    let args: unknown;
    try {
      args = JSON.parse(rawArgs);
    } catch {
      patchLast((m) => ({ ...m, tools: m.tools.map((t) => (t.id === callId ? { ...t, state: "output-error", error: "AI gửi lệnh xây lỗi" } : t)) }));
      return;
    }
    const { clear, objects } = aiMapObjects(args);
    const st = useStudio.getState();
    if (clear) st.setObjects(objects);
    else st.spawnMany(objects);
    patchLast((m) => ({
      ...m,
      tools: m.tools.map((t) => (t.id === callId ? { ...t, state: "output-available", input: args, output: { added: objects.length, cleared: clear } } : t)),
    }));
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || status === "submitted" || status === "streaming") return;
    const history = [...messages, { id: uid(), role: "user" as const, text: content, tools: [] }];
    const free = freeReply(content);
    if (free) {
      setMessages([...history, { id: uid(), role: "assistant", text: free, tools: [] }]);
      return;
    }
    setMessages([...history, { id: uid(), role: "assistant", text: "", tools: [] }]);
    setStatus("submitted");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const { data } = await supabase.auth.getSession();
      const customKey = localStorage.getItem("bom_custom_gemini_key")?.trim() || "";
      const headers: Record<string, string> = {
        "content-type": "application/json",
        authorization: `Bearer ${data.session?.access_token ?? ""}`,
      };
      if (customKey) {
        headers["x-gemini-key"] = customKey;
      }

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        signal: ctrl.signal,
        headers,
        body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: historyText(m) })), scene: sceneSummary() }),
      });
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? "AI tạm thời lỗi, thử lại sau");
      }
      setStatus("streaming");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true }).replace(/\r\n/g, "\n");
        let cut: number;
        while ((cut = buf.indexOf("\n\n")) >= 0) {
          const frame = buf.slice(0, cut);
          buf = buf.slice(cut + 2);
          const raw = frame.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
          if (!raw || raw === "[DONE]") continue;
          let ev: { type?: string; delta?: string; item?: { type?: string; id?: string; call_id?: string; name?: string; arguments?: string }; error?: unknown };
          try {
            ev = JSON.parse(raw);
          } catch {
            continue;
          }
          if (ev.type === "response.output_text.delta" && ev.delta) {
            const d = ev.delta;
            patchLast((m) => ({ ...m, text: m.text + d }));
          } else if (ev.type === "response.output_item.added" && ev.item?.type === "function_call") {
            const id = ev.item.call_id ?? ev.item.id ?? uid();
            patchLast((m) => ({ ...m, tools: [...m.tools, { id, state: "input-streaming" }] }));
          } else if (ev.type === "response.output_item.done" && ev.item?.type === "function_call" && ev.item.name === "build_map") {
            const id = ev.item.call_id ?? ev.item.id ?? uid();
            patchLast((m) => (m.tools.some((t) => t.id === id) ? m : { ...m, tools: [...m.tools, { id, state: "input-available" }] }));
            applyBuild(id, ev.item.arguments ?? "{}");
          } else if (ev.type === "error" || ev.type === "response.failed" || ev.error) {
            throw new Error("AI tạm thời lỗi, thử lại sau");
          }
        }
      }
      patchLast((m) => {
        const built = m.tools.find((t) => t.output);
        return !m.text && built ? { ...m, text: `Xong! Mình đã đặt ${built.output!.added} vật thể vào map. Bấm **Lưu** để giữ lại nhé.` } : m;
      });
      setStatus("ready");
    } catch (e) {
      if (ctrl.signal.aborted) {
        setStatus("ready");
      } else {
        const msg = e instanceof Error ? e.message : "AI tạm thời lỗi, thử lại sau";
        patchLast((m) => ({ ...m, text: m.text ? `${m.text}\n\n> ⚠️ ${msg}` : `> ⚠️ ${msg}` }));
        setStatus("error");
      }
    } finally {
      abortRef.current = null;
      requestAnimationFrame(focusInput);
    }
  };

  const busy = status === "submitted" || status === "streaming";

  return (
    <aside
      ref={boxRef}
      className="fixed inset-y-0 right-0 z-50 flex w-[min(26rem,48vw)] min-w-[18rem] flex-col border-l border-border bg-popover shadow-float animate-float-in"
    >
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <img src={bomAi} alt="" width={816} height={816} className="h-8 w-8 rounded-lg" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Bờm AI</h2>
          <p className="truncate text-[11px] text-muted-foreground">Hỏi gì cũng được · Nhờ xây map từ model có sẵn</p>
        </div>
        <StudioButton
          size="icon"
          variant={savedKey ? "primary" : "ghost"}
          aria-label="Cài đặt API Key Gemini"
          title={savedKey ? "Đang dùng Key Gemini cá nhân" : "Nhập Key Gemini riêng"}
          onClick={() => setShowKeyDialog((v) => !v)}
        >
          <Key className="h-4 w-4" />
        </StudioButton>
        <StudioButton size="icon" variant="ghost" aria-label="Trò chuyện mới" disabled={busy || messages.length === 0} onClick={() => setMessages([])}>
          <RotateCcw className="h-4 w-4" />
        </StudioButton>
        <StudioButton size="icon" variant="ghost" aria-label="Đóng" onClick={onClose}>
          <X className="h-4 w-4" />
        </StudioButton>
      </header>

      {/* Bảng nhập Key cá nhân */}
      {showKeyDialog && (
        <div className="border-b border-border bg-secondary/60 p-3 text-xs space-y-2">
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-primary" /> Key Gemini cá nhân
            </span>
            {savedKey ? (
              <span className="text-[10px] text-primary font-medium">● Đang bật key riêng</span>
            ) : (
              <span className="text-[10px] text-muted-foreground">Chưa nhập</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Key lưu trực tiếp trên máy của bạn, không bị nghẽn khi đông người dùng chung. Lấy miễn phí tại:{" "}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary underline">
              Google AI Studio
            </a>
          </p>
          <div className="flex gap-1.5">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Dán AIzaSy... vào đây"
              className="flex-1 rounded-md border border-input bg-background px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <StudioButton size="sm" onClick={handleSaveKey}>
              Lưu
            </StudioButton>
          </div>
          {savedKey && (
            <button
              type="button"
              onClick={() => {
                setApiKeyInput("");
                localStorage.removeItem("bom_custom_gemini_key");
                setSavedKey("");
              }}
              className="text-[11px] text-destructive hover:underline"
            >
              Xoá key riêng (quay về key mặc định)
            </button>
          )}
        </div>
      )}

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-4 p-3">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<img src={bomAi} alt="" width={816} height={816} loading="lazy" className="h-16 w-16 rounded-2xl" />}
              title="Chào bạn, mình là Bờm AI"
              description="Nhờ mình xây map hoặc hỏi bất cứ điều gì."
            >
              <div className="mt-3 flex flex-col items-center gap-3">
                <img src={bomAi} alt="" width={816} height={816} loading="lazy" className="h-16 w-16 rounded-2xl" />
                <div>
                  <p className="text-sm font-semibold">Chào bạn, mình là Bờm AI</p>
                  <p className="text-xs text-muted-foreground">Nhờ mình xây map hoặc hỏi bất cứ điều gì.</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs transition-colors hover:border-primary hover:bg-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m, i) => (
              <Message key={m.id} from={m.role}>
                <MessageContent className={m.role === "user" ? "bg-primary text-primary-foreground" : "bg-transparent p-0 text-foreground"}>
                  {m.tools.map((t) => (
                    <Tool key={t.id} defaultOpen={false} className="mb-2 border-border">
                      <ToolHeader
                        type="dynamic-tool"
                        toolName="build_map"
                        title={t.output ? `Xây map · ${t.output.added} vật thể` : "Đang xây map…"}
                        state={t.state}
                      />
                      <ToolContent>
                        <ToolInput input={t.input ?? {}} />
                        <ToolOutput
                          output={t.output ? `${t.output.cleared ? "Đã xoá map cũ. " : ""}Đã đặt ${t.output.added} vật thể.` : undefined}
                          errorText={t.error}
                        />
                      </ToolContent>
                    </Tool>
                  ))}
                  {m.role === "assistant" && !m.text && m.tools.length === 0 && i === messages.length - 1 && busy ? (
                    <Shimmer className="text-sm">Bờm AI đang nghĩ…</Shimmer>
                  ) : m.role === "assistant" ? (
                    <MessageResponse>{m.text}</MessageResponse>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  )}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-2">
        <PromptInput onSubmit={(msg: PromptInputMessage) => void send(msg.text)}>
          <PromptInputTextarea placeholder="Nhắn cho Bờm AI… (vd: xây lâu đài bằng part)" />
          <PromptInputFooter className="justify-between">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Hammer className="h-3 w-3" /> AI đặt vật thể trực tiếp vào map
            </span>
            <PromptInputSubmit status={status} onStop={() => abortRef.current?.abort()} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </aside>
  );
                                          }
        
