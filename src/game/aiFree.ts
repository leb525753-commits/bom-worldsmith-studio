/** Built-in Bờm AI answers that are shown instantly without calling the AI (so they cost no credit). */
const TEACHERS_DAY = `🌸 **Chúc mừng Ngày Nhà giáo Việt Nam 20/11!** 🌸

Bờm AI xin gửi lời tri ân tới tất cả thầy cô — những người đã dạy chúng ta từng con chữ, từng phép tính và cả cách làm người.

Chúc thầy cô luôn mạnh khỏe, hạnh phúc và tràn đầy niềm vui bên học trò! 💐

*Mẹo:* thử làm một game tặng thầy cô bằng Bờm Studio — ví dụ một ngôi trường bằng Part rồi bấm **Lưu** và mời cả lớp vào chơi chung nhé!`;

export function freeReply(text: string): string | null {
  const t = text.trim().replace(/\s+/g, "");
  if (/^20[/\-.]11$/.test(t)) return TEACHERS_DAY;
  return null;
}
