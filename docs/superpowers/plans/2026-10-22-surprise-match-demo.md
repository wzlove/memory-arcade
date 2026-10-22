# Surprise Match Demo Implementation Plan

**Goal:** Deliver a playable three-box matching game with six memories, a letter and a guaranteed gift.

**Architecture:** Keep the platformer reachable at `?mode=platformer`. The default app uses a pure matching reducer and a React board. Reuse story assets and audio; isolate new styling from the legacy screen. Save validated progress locally, with no backend or new runtime dependencies.

**Tech Stack:** React, CSS, inline SVG artwork, Vite, Vitest.

## Approved design

- Seven tray slots; triples resolve before checking capacity.
- Three curated scenes (18, 36, 36 objects), with six automatic memory milestones.
- Layered object stacks with clear exposed/covered states; each scene has a verified solution.
- Unlimited undo and a help action that removes a matching triple even when stuck.
- Progress and revealed memories survive refresh; storage failure never prevents play.
- Completing the last scene guarantees access to the letter and gift. Optional keepsake interaction reveals an extra voucher.
- Keyboard-accessible controls, native modal focus handling, responsive layout, reduced motion.
- Sample story content only; no real recipient information is assumed.

## Tasks

- [x] Add `src/game/MatchGame.test.js` first: solutions, blocking, triple-before-full, undo, help, milestones, persistence validation and gated ending.
- [x] Add `src/content/match.js` and `src/game/MatchGame.js`: curated boards, reducer, save validation.
- [x] Add `src/components/MatchGame.jsx`, `KeepsakeArt.jsx` and `src/match.css`: playable board, collection, modal memories, final letter/gift.
- [x] Update `src/App.jsx`, entry styles and metadata; retain existing platformer entry. Update offline cache version and documentation.
- [x] Run full tests/build; inspect desktop/mobile in a browser and play the complete flow, reload, undo, help and restart. Fix any regressions and document actual limits.

## Verification

`npm test -- src/game/MatchGame.test.js` must fail before the implementation exists, then pass with real reducers and all curated boards. `npm run check` must pass for both game modes. Browser checks cover pointer/keyboard interaction, overflow at a narrow viewport, modal exits, every stage transition, refresh persistence and guaranteed gift access.

## Verified outcome

- `npm run check`: 30 tests passed across three files; production build succeeded.
- Chromium browser walkthrough: pointer and Enter selection, undo after reload, help dialog / Escape, all three stages and six memory dialogs, letter reload, gift and bonus, collection replay, restart cancel / confirm and legacy entry passed with no page errors.
- Layout inspected at 1440px desktop and 390px mobile; 320px overflow check passed. Screenshots are in ignored `dogfood-output/`.
- Local Vite demo runs at `http://127.0.0.1:5173/`; opened in the app browser.
- No additional runtime dependencies, backend or public deployment. No physical-device / Safari audio or offline-service-worker test was performed.

## Gift difficulty revision

The user's follow-up replaces the relaxed final box with a 54-piece, nine-kind challenge. Matching pieces cross stack layers; one-layer previews make planning possible. Each attempt allows one assisted triple and two undos. Spent assistance is not restored by undo or reload. Retrying the final box restores its board and budgets, preserving memories. Only clearing the board opens the letter/gift flow; completed players can replay this box directly.

Save schema v2 keeps the existing storage key. Valid v1 saves in boxes one/two retain their boards. Unfinished v1 final boards restart at the new final board with memories intact; previously opened endings remain accessible.

Verified: 34 tests and production build; browser walkthrough of both early boxes, assistance + undo + reload budgets, and all 54 clicks on a no-assistance solution ending with six memories and the letter unlock. The simulated route proves solvability, not a human completion-rate estimate.

## Difficulty adjustment after play feedback

Reduced the gift box to 36 pieces / six kinds / six layers, with three assisted triples and five undos. The tray remains seven slots and clearing the final box still gates the gift. Next-layer previews remain. Save schema v3 validates both earlier final layouts before upgrading unfinished final boards and preserving memories; previously completed gifts stay open. UI counts, help, retry text and README match the new limits.

Verification: 35 tests, production build, migration of an existing v2 browser save, and a complete 36-click no-assistance browser solution passed. Human difficulty calibration remains based on user feedback.
