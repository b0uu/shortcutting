# Implementation Guidance

This file distills `spec.md` and `shortcutting_codex_handoff.md` into implementation-ready guidance. It is not an implementation plan and should not be treated as permission to write code during guidance-only work.

## Architecture Expectations

- Build a desktop-first web app.
- Recommended MVP stack: Next.js, TypeScript, custom CSS/CSS Modules using handoff tokens, Framer Motion outside the active editor, Vitest, and Playwright.
- Keep the MVP local-first. Do not implement Supabase during the initial MVP.
- Define a `ResultLogger` interface early and back it with a local implementation.
- Keep core logic outside UI components: challenge generation, validation, diffing, timer state, event logging, personal-best keys, result summaries, and share-card data shaping.
- Treat the handoff's designed edit surface as a serious product decision. The contenteditable/custom-cursor approach is acceptable if it can preserve reliable text editing, shortcut behavior, selection, paste, undo/redo, and exact validation. A textarea/custom visual-layer approach is also acceptable if Plan Mode explains why it better preserves product behavior without losing the handoff's feel.

## Handling Spec And Handoff Tensions

Some differences are expected because the handoff was produced after the core UI was designed.

- `spec.md` controls what the product must do.
- The handoff controls how the product should feel and look.
- Later, more concrete design recommendations in the handoff should be weighed heavily when they concern the editing surface, cursor, layout, animation, and results/share-card presentation.
- Earlier spec implementation notes should not override a later handoff UI choice unless the handoff would break locked behavior.
- When the handoff says "in-memory" or gives a prototype simplification, preserve the spec's local-first requirement by introducing local persistence in a way that does not complicate the first playable loop.
- When the handoff says the cursor is "always at the end" but the spec requires realistic keyboard editing habits, Plan Mode should decide whether that is a first-pass simplification, a visual-only cursor constraint, or a product limitation that needs correction.
- Any unresolved choice should be captured in `docs/implementation-plan.md` with a recommendation and rationale.

## Suggested File Structure

Actual structure should follow the chosen framework, but keep these ownership boundaries:

```text
src/
  app/ or pages/
  components/
    game/
    results/
    settings/
  domain/
    challenges/
    validation/
    diff/
    timer/
    results/
    events/
  storage/
    resultLogger.ts
    localResultLogger.ts
  styles/
  test/
```

## Domain Model List

Model these concepts explicitly:
- `Challenge`
- `ChallengeSegment`
- `ChallengeError`
- `SkillTag`
- `TestConfig`
- `TestRun`
- `ChallengeResult`
- `TestResult`
- `PersonalBestKey`
- `SelectionState`
- `EditEvent`
- `ResultLogger`

Use the type drafts in `spec.md` as the starting point.

## Game State Phases

At minimum, model:
- `pre-test`: landing/start state with loaded challenge preview.
- `intro`: overlay shown before active editing.
- `active`: user input can start or continue the timer.
- `matched`: exact match detected, transition in progress.
- `complete`: all parts completed and results are shown.
- `settings`: modal/panel state when not mid-challenge.

Timer state should be separate from visual screen state.

## Player-Facing Mental Model

- The user sees one challenge composed of multiple parts.
- Do not present the run as multiple challenges in visible copy, accessibility labels, result metadata, or share cards.
- Use `part` for progress and settings labels, such as `part 1 of 3` and `3-part challenge`.
- Internal domain names may still use `Challenge`, `ChallengeResult`, and `challengeCount` where they represent generated part data.

## Challenge Generation Requirements

- Deterministic and seeded.
- Template-based only; no AI generation in MVP.
- Use productivity, developer, and clean casual sentence templates.
- Default challenge length is 3 parts, with a 4-part option for MVP.
- Older 5/10/25 isolated-run language is deferred and should not surface in the MVP UI.
- Standard difficulty only for MVP.
- Include hidden error types and skill tags for analytics.
- Support MVP error types from the spec: extra/missing/wrong words, punctuation, apostrophes, capitalization, spaces, characters, newlines, word order, and character order.

## Validation Rules

- Target Match uses strict equality: `currentText === targetText`.
- Whitespace matters, including double spaces, trailing spaces, and newlines when present.
- Auto-advance on exact match.
- No fuzzy matching.
- Smart quote and dash equivalence should be handled intentionally by templates, not by broad normalization.
- Drill Mode may validate text equality, cursor position, selection range, or combinations depending on drill type.

## Timer Rules

- Timer never starts on mount.
- Timer starts on first user input inside the active part.
- Results emphasize elapsed completion time.
- Timer continues across all parts and stops after the final exact match.
- Running display should use the handoff’s compact timer style.

## Editor Behavior

- Default cursor starts at the end of editable text.
- Use the handoff's edit block styling, custom cursor intent, and Monkeytype-like feel as the target experience.
- Do not treat the spec's textarea note and the handoff's contenteditable note as a simple winner-takes-all conflict. The implementation plan should choose the editing primitive after considering shortcut fidelity, selection behavior, visual cursor control, diff rendering, accessibility, and implementation risk.
- Keyboard-only is the default mouse policy.
- In keyboard-only mode, block or ignore mouse cursor movement/selection during an active timed run.
- In mouse-allowed mode, record mouse actions and categorize results separately.
- Initial focus before the timer starts should not count as mouse usage.
- Allow cut, copy from editable text, paste into editable text, undo, and redo.
- Restrict ordinary selection/copy of target text.
- Disable spellcheck, autocorrect, and autocapitalize in the edit surface.
- If the first implementation limits cursor rendering or mid-text cursor visuals for speed, it must not prevent the user from completing Target Match with realistic keyboard editing. Document any such limitation clearly.

## Hint And Diff Behavior

- Hints appear after 5 seconds of no keyboard input.
- Any keypress hides the hint and resets the timeout.
- One hint level is enough for MVP.
- Hints should appear near the editable text.
- Stuck-state diff pointers should appear after the same inactivity trigger.
- Diff should be subtle and local to the editable area: wrong characters, invisible whitespace indicators, punctuation markers, capitalization cues, and newline indicators.

## Local-First Result Logging

- Store settings and personal bests locally for MVP.
- Record enough event data to support future analytics: keydown, input, selection changes, mouse actions, clipboard actions, timestamps, text before/after, selection before/after, challenge ID, and hint visibility.
- Use localStorage for small settings and personal-best summaries; consider IndexedDB only for larger detailed event logs. Do not require network access.
- Keep `SupabaseResultLogger` as a later implementation concern only.

## Personal Best Categorization

Personal bests must be segmented by:
- mode
- part count
- platform
- mouse policy
- difficulty
- challenge pack or seed category

Keyboard-only and mouse-allowed results must not share a personal-best bucket.

## Share Card Requirements

- Downloadable image is included in MVP.
- Share card emphasizes elapsed time, before/after text, mode, part count, platform, mouse policy, and a small brand mark.
- It should be visible in-app on the results screen and exportable as an image.
- Use the handoff’s 1280 by 640 @2x dark-theme export direction unless the implementation plan proposes a justified adjustment.

## Drill Mode Scope

- Drill Mode is in MVP but should remain narrower than Target Match.
- It trains atomic editing operations such as word movement, line movement, deleting words, selecting words, replacing a word, and inserting punctuation.
- It should be test-like, not tutorial-like.
- Do not show persistent shortcut instructions by default; show a platform-specific hint after 5 seconds of no input.
- Keep the first Drill set small enough to validate architecture without delaying Target Match polish.

## Explicit Non-Goals

- Supabase in initial MVP.
- Login, accounts, global leaderboard, or public profiles.
- AI-generated challenges.
- Code-editing mode.
- Vim mode.
- Browser/system shortcut training.
- Native desktop app or browser extension.
- Full shortcut remapping.
- Replay timeline, keyboard heatmap, adaptive difficulty, daily challenge, custom challenge creator, and challenge links.
