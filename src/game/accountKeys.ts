/** Name → login identity. Pure helpers (no network) so they stay unit-testable. */
export const keyOf = (name: string) => name.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();

export const displayName = (name: string) => name.normalize("NFC").trim().replace(/\s+/g, " ");

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Players only type a name; the sign-in service needs an email, so derive a fixed one per name. */
export async function authEmail(name: string): Promise<string> {
  return `u${(await sha256(`bom-studio:${keyOf(name)}`)).slice(0, 40)}@players.bomstudio.app`;
}

/** Any typed password works (even "1"), so pad it past the service's minimum length. */
export const authPassword = (pass: string) => `bom-studio::${pass}`;
