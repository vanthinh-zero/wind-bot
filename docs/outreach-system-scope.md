# Outreach System — Scope

## Goal
Build a small, auditable outreach workflow for Wind. It must help the owner prepare and track promotion for communities that explicitly allow bot promotion; it must not mass-join servers, mass-DM users, or send unsolicited bulk messages.

## Phase 1
- Target records can be added manually or from an approved/permissioned source.
- Eligibility check records whether a target has a clearly permitted promotion channel/process.
- Queue items before sending.
- Human approval before the first automated send.
- Cooldown and duplicate-contact protection.
- Track campaign, locale, channel, status, and result.
- Vietnamese and English campaign templates.
- Unknown/low-confidence locale goes to manual review.

## Minimal modules
- src/outreach/OutreachManager.js
- src/outreach/EligibilityChecker.js
- src/outreach/ContactQueue.js
- src/outreach/RateLimiter.js
- src/outreach/OutreachTracker.js
- src/outreach/MessageBuilder.js
- src/outreach/locales/vi.js
- src/outreach/locales/en.js
- src/handlers/outreach.js

Do not add a generic plugin framework, external database, web scraper, or automatic server-joining system in Phase 1.

## Suggested admin commands
- /outreach status
- /outreach preview
- /outreach queue
- /outreach approve
- /outreach pause
- /outreach stats

## Target lifecycle
discovered -> eligible -> queued -> approved -> contacted -> responded -> installed -> active

Alternative terminal states:
skipped, rejected, cooldown, manual_review

## Locale policy
Use explicit locale when available. Otherwise calculate a confidence score from available server metadata. If confidence is insufficient, use manual_review rather than guessing.

## Acceptance criteria
- No unsolicited DM workflow.
- No automatic mass server joining.
- No repeated contact while a cooldown is active.
- Every contact has a stored campaign and timestamp.
- Preview works without sending.
- Tests cover duplicate prevention, cooldown, locale selection, and blocked targets.
