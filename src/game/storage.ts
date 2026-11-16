import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Account } from "./accounts";
import { keyOf } from "./accountKeys";
import type { Project } from "./types";

/** Saved games live in Lovable Cloud; every signed-in player can see and play them. */
export interface GameSummary {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  objectCount: number;
  updatedAt: number;
  /** Temporary link to the cover image, if the owner set one. */
  coverUrl: string | null;
}

const COLS = "id, name, owner_id, owner_name, object_count, updated_at, cover_url";
const COVERS = "game-covers";

type Row = { id: string; name: string; owner_id: string; owner_name: string; object_count: number; updated_at: string; cover_url: string | null };
const toSummary = (r: Row): GameSummary => ({
  id: r.id,
  name: r.name,
  ownerId: r.owner_id,
  ownerName: r.owner_name,
  objectCount: r.object_count,
  updatedAt: Date.parse(r.updated_at),
  coverUrl: null,
});

/** Covers live in a private bucket, so list views get short-lived signed links. */
async function withCovers(rows: Row[]): Promise<GameSummary[]> {
  const out = rows.map(toSummary);
  const paths = rows.map((r) => r.cover_url).filter((p): p is string => !!p);
  if (paths.length === 0) return out;
  const { data } = await supabase.storage.from(COVERS).createSignedUrls(paths, 60 * 60);
  const urls = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  rows.forEach((r, i) => {
    if (r.cover_url) out[i]!.coverUrl = urls.get(r.cover_url) ?? null;
  });
  return out;
}

export async function listGames(ownerId?: string): Promise<GameSummary[]> {
  let q = supabase.from("games").select(COLS).order("updated_at", { ascending: false }).limit(200);
  if (ownerId) q = q.eq("owner_id", ownerId);
  const { data, error } = await q;
  if (error) throw error;
  return withCovers(data ?? []);
}

function asProject(data: unknown, id: string): Project | null {
  const p = data as Project | null;
  return p && Array.isArray(p.objects) && p.player ? { ...p, id } : null;
}

export async function getGame(id: string): Promise<{ project: Project; ownerId: string; ownerName: string } | null> {
  const { data, error } = await supabase.from("games").select("id, owner_id, owner_name, data").eq("id", id).maybeSingle();
  if (error) throw error;
  const project = data ? asProject(data.data, data.id) : null;
  return data && project ? { project, ownerId: data.owner_id, ownerName: data.owner_name } : null;
}

export async function saveProject(p: Project, account: Account) {
  const { error } = await supabase.from("games").upsert({
    id: p.id,
    owner_id: account.id,
    owner_name: account.name,
    name: p.name,
    data: p as unknown as Json,
    object_count: p.objects.length,
    updated_at: new Date(p.updatedAt).toISOString(),
  });
  if (error) throw error;
}

/** Shrinks the picked image to a JPEG so covers stay small and load fast. */
async function toJpeg(file: File, max = 960): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return new Promise((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error("encode"))), "image/jpeg", 0.85));
}

/** Uploads a new cover for a saved game the account owns. */
export async function setCover(gameId: string, file: File, account: Account) {
  const blob = await toJpeg(file);
  const path = `${account.id}/${gameId}-${Date.now()}.jpg`;
  const up = await supabase.storage.from(COVERS).upload(path, blob, { contentType: "image/jpeg" });
  if (up.error) throw up.error;
  const { data: old } = await supabase.from("games").select("cover_url").eq("id", gameId).maybeSingle();
  const { error } = await supabase.from("games").update({ cover_url: path }).eq("id", gameId).eq("owner_id", account.id);
  if (error) throw error;
  if (old?.cover_url) void supabase.storage.from(COVERS).remove([old.cover_url]);
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("games").delete().eq("id", id);
  if (error) throw error;
}

/** Moves projects saved in this browser before cloud accounts existed into the signed-in account. */
export async function importLocalProjects(account: Account) {
  const keys = ["bom-studio.projects.v1", `bom-studio.projects.v1:${keyOf(account.name)}`];
  for (const k of keys) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    try {
      const list = JSON.parse(raw) as Project[];
      for (const p of Array.isArray(list) ? list : []) {
        if (p && typeof p.id === "string" && Array.isArray(p.objects)) await saveProject(p, account);
      }
      localStorage.removeItem(k);
    } catch {
      /* keep the local copy if the upload fails */
    }
  }
}
