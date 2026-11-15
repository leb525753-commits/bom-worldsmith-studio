<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Game rules (Code parser, Code Game parser, play sim) live in `src/game/sim/` as plain TypeScript with no React/three imports, so they stay unit-testable (`src/game/sim/rules.test.ts`).
- Per-frame play state lives in `src/game/runtime.ts` (outside React); the zustand store only holds edit data, selection and HUD values. Stop restores the pre-Play scene because play never writes to the store's objects.
- Scene objects are keyed by `session` in `World.tsx`, so Play/Stop remount them and reset any runtime-driven transforms.
- Studio, `/games` and `/play/$gameId` routes use `ssr: false`; games persist in the Cloud `games` table via `src/game/storage.ts` (signed-in players read games with `is_public` plus their own; only the owner writes).
- Play-together uses one Realtime broadcast/presence room per game (`src/game/multiplayer.ts`); remote positions live in a module Map outside React, like the play runtime.
- Dev builds expose `window.__studio` (the zustand store) for scripted browser checks.
