/** Game accounts, saved in this browser. Name match is case-insensitive. */
const ACCOUNTS = "bom-studio.accounts.v1";
const SESSION = "bom-studio.session.v1";
const LEGACY_PROJECTS = "bom-studio.projects.v1";

interface Account {
  key: string;
  name: string;
  hash: string;
}

export type LoginResult = { ok: true; name: string; created: boolean } | { ok: false; error: string };

const keyOf = (name: string) => name.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();

async function hashPass(key: string, pass: string): Promise<string> {
  const data = new TextEncoder().encode(`bom-studio:${key}:${pass}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function readAccounts(): Account[] {
  try {
    const list = JSON.parse(localStorage.getItem(ACCOUNTS) ?? "[]") as unknown;
    return Array.isArray(list) ? (list as Account[]) : [];
  } catch {
    return [];
  }
}

export function projectsKey(accountKey: string) {
  return `${LEGACY_PROJECTS}:${accountKey}`;
}

/** New name → creates the account. Existing name → password must match. */
export async function login(name: string, pass: string): Promise<LoginResult> {
  const key = keyOf(name);
  if (!key) return { ok: false, error: "Hãy nhập tên" };
  if (!pass) return { ok: false, error: "Hãy nhập mật khẩu" };
  const accounts = readAccounts();
  const hash = await hashPass(key, pass);
  const found = accounts.find((a) => a.key === key);
  if (found) {
    if (found.hash !== hash) return { ok: false, error: "Sai mật khẩu" };
    localStorage.setItem(SESSION, key);
    return { ok: true, name: found.name, created: false };
  }
  accounts.push({ key, name: name.trim(), hash });
  localStorage.setItem(ACCOUNTS, JSON.stringify(accounts));
  // Projects saved before accounts existed go to the first account created.
  const legacy = localStorage.getItem(LEGACY_PROJECTS);
  if (legacy && accounts.length === 1) {
    localStorage.setItem(projectsKey(key), legacy);
    localStorage.removeItem(LEGACY_PROJECTS);
  }
  localStorage.setItem(SESSION, key);
  return { ok: true, name: name.trim(), created: true };
}

export function logout() {
  localStorage.removeItem(SESSION);
}

/** Signed-in account, or null. */
export function currentAccount(): { key: string; name: string } | null {
  if (typeof window === "undefined") return null;
  const key = localStorage.getItem(SESSION);
  if (!key) return null;
  const a = readAccounts().find((x) => x.key === key);
  return a ? { key: a.key, name: a.name } : null;
}
