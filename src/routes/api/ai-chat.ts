import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { AI_KINDS, AI_MAP_LIMIT } from "@/game/sim/aiMap";

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(12000) }))
    .min(1)
    .max(60),
  scene: z.string().max(6000).default(""),
});

const INSTRUCTIONS = `Bạn là "Bờm AI", trợ lý trong Bờm Studio — ứng dụng làm game 3D kiểu Roblox Studio.
- Luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn. Trả lời được mọi câu hỏi (học tập, ý tưởng game, đời sống...).
- Khi người chơi muốn làm/xây/tạo map, nhà cửa, công trình, đường đua, mê cung... hãy GỌI function build_map để đặt vật thể thật vào thế giới, rồi tóm tắt 1 câu ngắn bạn đã xây gì.
Thế giới: mặt đất phẳng 120×120, toạ độ x và z từ -58 đến 58, y là độ cao đáy (0 = mặt đất). Người chơi ở (0, 0, 4).
Kích thước vật thể (rộng x × cao y × sâu z):
- part: khối hộp 2×1×2, đổi màu bằng "color" (#rrggbb). Kéo dài bằng sx/sy/sz.
- block: khối 1.2, màu tùy chọn.
- house: nhà 4×4 có mái. house2: nhà 2 tầng 4×4.
- road: đường 3×8 theo trục z.
- tree: cây táo cao ~4.4. bush: bụi cây ~1.4. sword: kiếm 10 dame. potion: bình thuốc +5 tốc độ.
- civilian: NPC dân thường 100 máu. monster: quái vật 100 máu, 5 dame.
Tối đa ${AI_MAP_LIMIT} vật thể mỗi lần. Chỉ đặt clear=true khi người chơi muốn xoá map cũ / làm lại từ đầu.`;

const json = (status: number, error: string) => Response.json({ error }, { status });

async function signedIn(request: Request): Promise<boolean> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!token || !url || !key) return false;
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await sb.auth.getUser(token);
  return !error && !!data.user;
}

export const Route = createFileRoute("/api/ai-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await signedIn(request))) return json(401, "Hãy đăng nhập để dùng AI");
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json(400, "Tin nhắn không hợp lệ");
        const { messages, scene } = parsed.data;

        const apiKey = process.env["GEMINI_API_KEY"];
        if (!apiKey) return json(500, "Chưa cấu hình GEMINI_API_KEY");

        const contents = messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

        const tools = [
          {
            functionDeclarations: [
              {
                name: "build_map",
                description: "Đặt các vật thể vào map hiện tại của người chơi.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    clear: { type: "BOOLEAN", description: "true nếu xoá map cũ" },
                    objects: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: {
                          kind: { type: "STRING", enum: [...AI_KINDS] },
                          x: { type: "NUMBER" },
                          y: { type: "NUMBER" },
                          z: { type: "NUMBER" },
                          sx: { type: "NUMBER" },
                          sy: { type: "NUMBER" },
                          sz: { type: "NUMBER" },
                          color: { type: "STRING" },
                        },
                        required: ["kind", "x", "z"],
                      },
                    },
                  },
                  required: ["objects"],
                },
              },
            ],
          },
        ];

        try {
          const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=" + apiKey;
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: `${INSTRUCTIONS}\n\nMap hiện tại:\n${scene || "(trống)"}` }] },
              contents,
              tools,
            }),
          });

          if (!res.ok) {
            const errData = await res.text();
            console.error("Gemini API error:", errData);
            return json(502, "Lỗi từ Gemini API, hãy kiểm tra lại key");
          }

          const data = (await res.json()) as any;
          const candidate = data.candidates?.[0]?.content?.parts ?? [];

          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              for (const part of candidate) {
                if (part.text) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "response.output_text.delta", delta: part.text })}\n\n`)
                  );
                }
                if (part.functionCall) {
                  const callId = "call_" + Math.random().toString(36).slice(2, 9);
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: "response.output_item.added",
                        item: { type: "function_call", id: callId, name: part.functionCall.name },
                      })}\n\n`
                    )
                  );
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: "response.output_item.done",
                        item: {
                          type: "function_call",
                          id: callId,
                          name: part.functionCall.name,
                          arguments: JSON.stringify(part.functionCall.args ?? {}),
                        },
                      })}\n\n`
                    )
                  );
                }
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        } catch (err) {
          console.error("Lỗi gọi Gemini:", err);
          return json(502, "Không thể kết nối đến Gemini");
        }
      },
    },
  },
});
  
