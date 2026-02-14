

# Add Ghost/AI Players for Solo Campaign Play

## Overview

GMs will be able to manually add "ghost" players to their campaigns -- useful for solo play, AI opponents, or placeholder slots. These players appear everywhere real players do (Player List widget, Players Manager, battle pairings) but aren't tied to a real user account.

## How It Works

A new "Add Player" button appears in both the **Players Manager** overlay and the **Player List** widget header (GM-only). Tapping it opens a modal styled like the existing Player Settings overlay where the GM fills in the player's details (name, faction, points, warband link, etc.). The record is saved to `campaign_players` with a deterministic placeholder UUID and a new `is_ghost` flag.

## Database Changes

Add a boolean column `is_ghost` (default `false`) to the `campaign_players` table. This lets the app distinguish real users from GM-created ghost players throughout the codebase.

Update the INSERT RLS policy to also allow campaign owners/GMs to insert rows (not just self-inserts). The current policy only allows `auth.uid() = user_id`, which blocks GM-created players. The new policy will be:

```
(auth.uid() = user_id) 
OR is_campaign_owner(campaign_id, auth.uid())
```

This is safe because it's already how the policy's WITH CHECK is written -- it just needs the owner path to work for ghost players too.

## New Files

| File | Purpose |
|---|---|
| `src/components/players/AddPlayerModal.tsx` | Modal form for GMs to create a ghost player. Fields: Name (required), Faction, Sub-Faction, Points, Warband Link, Additional Info. Generates a deterministic UUID for the `user_id` using the campaign ID + a random suffix. |

## Modified Files

| File | Change |
|---|---|
| `src/components/dashboard/widgets/PlayersManagerWidget.tsx` | Add an "Add Player" button in the header (next to player count). Import and render `AddPlayerModal`. |
| `src/components/dashboard/widgets/PlayerListWidget.tsx` | Add an "Add Player" button in the header for GMs. Import and render `AddPlayerModal`. |
| `src/components/dashboard/widgets/PlayersWidget.tsx` | Show ghost players with a "Bot" or "Ghost" badge instead of a user avatar. Add "Add Player" button for GMs. |
| `src/hooks/useCampaignPlayers.ts` | Ghost players won't have profile entries, so handle `null` profile gracefully (already mostly handled). |
| `src/hooks/usePlayerSettings.ts` | In `useAllPlayerSettings`, handle ghost players that have no `profiles_public` entry -- use `player_name` as the display name directly. |

## UI Details

- Ghost players display a distinct badge: a small "AI" or robot icon badge next to their name
- The "Add Player" button uses the existing `TerminalButton` style with a `UserPlus` icon
- The modal reuses the same field layout as the Player Settings overlay for consistency
- GMs can edit ghost players via the existing Players Manager collapsible cards (already works since GMs can update any player)
- GMs can delete ghost players via a delete button on the player card (new addition to `PlayersManagerWidget`)

## Technical Details

- Ghost player `user_id` values are generated as `crypto.randomUUID()` -- these will never collide with real auth UIDs
- The `is_ghost` column lets queries and UI logic identify these records without fragile UUID-pattern checks
- Ghost players inherit all existing functionality: they appear in battle pairings, player lists, narrative tables, etc.
- No changes needed to battle tracker or dice roller -- those already work with `campaign_players` records by ID
- The existing "GMs and self can remove players" DELETE policy already covers GM deletion of ghost players

