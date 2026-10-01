# Wind Game Direction — Scope

## Product observation
Wind is already a multi-purpose Discord bot. The current repository contains many handlers for community utilities, games, Pet, AI, profiles, tickets, moderation, setup, and Detective. Detective should remain a flagship experience, not become the entire identity of Wind.

## Direction
Use a small set of distinct "reasons to use Wind" instead of adding many shallow commands.

### Pillar A — Social / party games
Prioritize fast, replayable games that work with 2+ people and create visible server activity.
Examples to evaluate:
- Detective
- Word-chain / reaction games
- short deduction or bluff-style rounds
- daily challenges

### Pillar B — Progression
Connect safe game activity to profile/progression:
- player profile
- achievements
- streaks
- server leaderboard
- cosmetic titles/badges

Do not create real-money gambling mechanics.

### Pillar C — Server utility
Keep the existing setup, moderation, ticket, welcome, profile, AI, and community tools stable.

## What makes a game "Wind-worthy"
1. Can start in under 10 seconds.
2. Creates a clear moment worth sharing.
3. Has a reason to return tomorrow.
4. Works in a Discord channel without external pages.
5. Does not require a large player base to be useful.
6. Has deterministic tests for core rules.

## Detective role
Keep Detective as the high-depth flagship. Improve presentation and replayability only when a concrete problem is identified. Do not keep adding evidence types or UI layers merely for size.

## Phase order
1. Stabilize existing features.
2. Add a lightweight game hub/discovery surface.
3. Pick one complementary social game and prototype it.
4. Connect achievements/profile only after the game loop is proven.
5. Add marketing/shareable surfaces after retention is measurable.

## Non-goals
- No rewrite of index.js.
- No replacement of existing handlers.
- No new universal framework.
- No large dependency additions unless a concrete feature requires one.
