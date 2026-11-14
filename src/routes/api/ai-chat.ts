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
- Luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn, dùng markdown khi hợp lý. Bạn trả lời được mọi câu hỏi (học tập, lập trình, ý tưởng game, đời sống...).
- Khi người chơi muốn làm/xây/tạo map, nhà cửa, công trình, đường đua, mê cung... hãy GỌI công cụ build_map để đặt vật thể thật vào thế giới, rồi viết 1-2 câu mô tả bạn đã xây gì.
Thế giới: mặt đất phẳng 120×120, toạ độ x và z từ -58 đến 58, y là độ cao đáy vật thể (0 = mặt đất). Người chơi xuất hiện ở (0, 0, 4).
Kích thước ở scale 1 (rộng x × cao y × sâu z):
- part: khối hộp 2×1×2, đổi màu bằng "color" (#rrggbb). Dùng sx/sy/sz để kéo dài (vd tường dài 10: sx=5). Xếp chồng bằng y.
- block: khối 1.2, màu tùy chọn.
- house: nhà 4×4 có mái, cao ~4.6. house2: nhà 2 tầng 4×4, cao ~7.2.
- road: đoạn đường 3 rộng × 8 dài theo trục z (xoay không được; dùng sx/sz để giãn).
- tree: cây táo cao ~4.4. bush: bụi cây ~1.4. sword: kiếm 10 dame. potion: bình thuốc +5 tốc độ.
- civilian: NPC dân thường 100 máu đi lang thang. monster: quái vật 100 máu, 5 dame, đuổi đánh người chơi.
Tối đa ${AI_MAP_LIMIT} vật thể mỗi lần. Chỉ đặt clear=true khi người chơi muốn xoá map cũ / làm lại từ đầu.`;

const BUILD_MAP = {
  type: "function" as const,
  name: "build_map",
  description: "Đặt các vật thể có sẵn (part, nhà, cây, đường...) vào map hiện tại của người chơi.",
  strict: false,
  parameters: {
    type: "object",
    properties: {
      clear: { type: "boolean", description: "true = xoá toàn bộ vật thể cũ trước khi xây" },
      objects: {
        type: "array",
        maxItems: AI_MAP_LIMIT,
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: [...AI_KINDS] },
            x: { type: "number" },
            y: { type: "number", description: "độ cao đáy, mặc định 0" },
            z: { type: "number" },
            sx: { type: "number" },
            sy: { type: "number" },
            sz: { type: "number" },
            color: { type: "string", description: "#rrggbb, chỉ cho part và block" },
          },
          required: ["kind", "x", "z"],
        },
      },
    },
    required: ["objects"],
  },
};

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
        const { streamResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
        try {
          const stream = await streamResponse({
            model: "openai/gpt-6-astra",
            instructions: `${INSTRUCTIONS}\n\nMap hiện tại:\n${scene || "(trống)"}`,
            input: messages.map((m) => ({ role: m.role, content: m.content })),
            tools: [BUILD_MAP],
          });
          return stream.toResponse();
        } catch (e) {
          if (e instanceof GatewayError) {
            console.error("ai-chat gateway error", e.code, e.httpStatus, e.ids);
            if (e.code === "rate_limited") return json(429, "AI đang bận, thử lại sau ít phút");
            if (e.code === "payment_required") return json(402, "Hết lượt dùng AI, cần nạp thêm credit");
            return json(502, "AI tạm thời lỗi, thử lại sau");
          }
          throw e;
        }
      },
    },
  },
});
