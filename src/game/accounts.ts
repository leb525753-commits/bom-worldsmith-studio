import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { authEmail, authPassword, displayName, keyOf } from "./accountKeys";

export interface Account {
  id: string;
  name: string;
}

export type LoginResult = { ok: true; name: string; created: boolean } | { ok: false; error: string };

const nameOf = (u: User) => (typeof u.user_metadata?.["display_name"] === "string" ? (u.user_metadata["display_name"] as string) : "Người chơi");

/** New name → creates the account. Existing name → password must match. */
export async function login(name: string, pass: string): Promise<LoginResult> {
  if (!keyOf(name)) return { ok: false, error: "Hãy nhập tên" };
  if (!pass) return { ok: false, error: "Hãy nhập mật khẩu" };
  const email = await authEmail(name);
  const password = authPassword(pass);
  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (!signIn.error && signIn.data.user) return { ok: true, name: nameOf(signIn.data.user), created: false };

  const shown = displayName(name);
  const signUp = await supabase.auth.signUp({ email, password, options: { data: { display_name: shown } } });
  if (signUp.error) {
    const already = signUp.error.code === "user_already_exists" || /already/i.test(signUp.error.message);
    return { ok: false, error: already ? "Sai mật khẩu" : "Không đăng nhập được, hãy thử lại" };
  }
  if (!signUp.data.session) return { ok: false, error: "Sai mật khẩu" };
  return { ok: true, name: shown, created: true };
}

export async function logout() {
  await supabase.auth.signOut();
}

/** Signed-in account, or null. */
export async function getAccount(): Promise<Account | null> {
  const { data } = await supabase.auth.getSession();
  const u = data.session?.user;
  return u ? { id: u.id, name: nameOf(u) } : null;
}
