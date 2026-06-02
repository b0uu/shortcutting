# shortcutting product spec

## 0. Working decision

Final product name: shortcutting

Future domain/name: shortcutting.xyz

Decision:
- Use shortcutting as the final product name.
- Use shortcutting.xyz as domain.
- The app will be made to be a pleasure to use: every click should be satisfying, every achievement should feel like progress, every statline inspires improvement. Incorporate minimalist design inspired by monkeytype and keybr

---

## 1. Concept

An editing speed game where users alter flawed text into target text by utilizing keyboard shortcuts tricks.

## 2. Product goals

### Primary goal

Help people learn efficient text editing methods by providing a fun, responsive, and satisfying interface.

### Secondary goals

- Train keyboard editing habits.
- Help users get faster at manipulating text.
- Create shareable result cards that show before/after text and completion time.
- Build a product that demonstrates strong product sense, frontend polish, and data/analytics thinking.

---

## 3. Target audience

Primary:
- Touch typers (developers, gamers).
- Power users who want to edit faster.
- Students and writers who spend a lot of time manipulating text.

Secondary:
- Vim/terminal special modes later (sorry nerds).
- More handheld guides/lessons in future.
- Productivity enthusiasts.

We assume users are already comfortable typing, it's not a beginner typing tutor.

---

## 4. Product feel

The app should feel:

- Game-like
- Minimalist
- Fast and responsive
- Smooth
- Satisfying
- Intentional design decisions
- Similar in simplicity and polish to monkeytype but not a clone

---

## 5. MVP plan

### 5.1 MVP decisions

- Final name: shortcutting
- Default run length: currently at 3
- Default mouse policy: keyboard-only
- Difficulty: Standard, Advanced, and Multi-line
- Downloadable share cards
- Backend: not required for first playable MVP, but to be implemented
- Data approach: local-first initially, but build with Supabase compatible architecture

Backend build process:
- Build the core game local-first.
- Define a clean `ResultLogger` interface from the beginning.
- Start with `LocalResultLogger`.
- Add `SupabaseResultLogger` only after the local-first product, analytics, history, and results screen feel good
- This keeps the MVP fast while preserving the product/data side later


### Include in MVP

- Desktop web app
- No login required
- Target match mode
- Drill mode
- Python-only Coding Mode
- Completion based tests
- Time as the primary score
- Mac, windows, linux support
- Platform auto-detection with override setting
- Exact final-state validation
- Hints after 5 seconds of inactivity
- Mouse policy settings
- Shortcut-path/event recording
- Keep track locally of personal bests, past scores, and run history
- Shareable visual result card
- Dark mode, light mode, and user-editable custom theme colors
- Sound effects with toggle
- Seeded challenge generation
- Deterministic templates that nurture learning and feel good to complete
- Skill-pack metadata for future analytics and adaptive practice
- Keyboard shortcut map
- Detailed settings

### Exclude from MVP

- Blind Fix mode
- Vim mode
- Terminal mode
- ^ For the above could probably get devs to contribute
- Browser/system shortcuts (prob not possible at all unless desktop app or some weird extension implementation)
- Chrome extension
- Native desktop app
- Global leaderboard
- User accounts, unless needed for database analytics
- Full custom shortcut remapping
- Replay timeline
- Keyboard heatmap
- Challenge links

---

## 6. Core game modes

## 6.1 Target match mode

This is the flagship mode.

The user sees:

1. Target text
2. Editable text
3. Minimal progress indicator
4. Optional subtle diff pointers after stuck state
5. Timer

The user must edit the flawed text until it exactly matches the target.

Example:

Target:
```text
However, this is a strong idea, but don't overcomplicate it.
```

Editable:
```text
however this is a very good idea but dont overcomplicate it
```

The user must:
- Capitalize `however`
- Insert comma after `However`
- Delete `very`
- Replace `good` with `strong`
- Insert comma after `idea`
- Add apostrophe in `dont`

The challenge auto-advances once the editable text exactly equals the target.

### Target text behavior

- Target text should appear above editable text.
- Target text should be visually readable but not overpowering.
- Target text should not be selectable/copyable through normal UI behavior.
- Copy/paste should remain allowed inside the editable area for legitimate editing operations such as cut-and-paste word movement.
- The app does not need to prevent every possible cheating path. This is a game, not a secure exam.

### Cursor start

Default:
- Cursor starts at the end of the editable text.

For multiline challenges:
- Cursor starts at the end of the editable passage, visually bottom-right.

This reinforces realistic editing: the player often needs to navigate backward or across the text efficiently.

---

## 6.2 Drill Mode

Drill mode is also part of MVP.

It trains basic editing operations such as:
- Move to previous word
- Move to next word
- Move to end of line
- Delete previous word
- Delete next word
- Select previous word
- Select next word
- Replace current word
- Insert punctuation at target position

Should be test-like, not tutorial-like (for now).

### Drill instruction style

No persistent shortcut instruction by default.

Example prompt:
```text
Delete the previous word.
```

If the user pauses for 5 seconds, show a hint.

Example:
```text
Hint: On Mac, try âŒ¥ + Backspace.
```

### Drill validation

Drill validation depends on the drill type.

Some drills validate:
- Text equality

Some drills validate:
- Cursor position

Some drills validate:
- Selection range

Some drills validate:
- Text equality + cursor position

---

## 7. Test structure

Tests are completion-based, not time-boxed. Can make separate time-based mode later

The player completes a predetermined amount of content. The result is the time taken.

Possible test lengths:

- 5 challenges
- 5 challenges
- 25 challenges
- Custom

Alternative later:
- 10 required corrections
- 25 required corrections
- 50 required corrections

Decision for MVP:
- Use 3 challenges as the default run length.
- Keep the system flexible so 10 and 25 challenge runs can be added or tested later.
- Track required corrections internally for analytics, but do not make correction count the main user-facing test format in MVP.
- Add correction-count tests later if user testing suggests they are better.

### Why completion based?

Because time is the easiest metric that all users will understand. Will make the share card cleaner and more intuitive and encourage more people to share and/or try out the app.

---

## 8. Current MVP flow

The user sees one continuous test made of 3 parts by default. Avoid exposing the word "challenge" in the live UI where "part" or "3-part challenge" is clearer.

Pre-test controls:
- Mode: Target Match / Drill / Coding
- Platform: Auto / Mac / Windows-Linux
- Length: 3 or 4 parts
- Difficulty: Standard / Advanced / Multi-line
- Mouse policy: Keyboard-only / Mouse allowed
- Sound: On / Off
- Theme: Dark / Light / Custom

There is no Start button and no intro overlay. The editor is ready immediately, and the timer starts on the first meaningful edit key or input. Tab, Escape, arrow keys, and modifier-only keys do not start the timer.

Active layout:
- Small timer and progress pips
- Current target or drill prompt
- One continuous editor flow with completed lines above the active line
- The active edit line stays in a stable vertical position
- Completed lines become immutable history

On exact completion of the active part, the current line moves into history, the next line appears at the same active position, the target/prompt crossfades, and the run timer continues. At the end, show the results screen.

## 9. Target Match

Target Match asks the user to transform flawed text into the displayed target text.

Validation is exact:
```ts
currentText === targetText
```

Whitespace matters. The only normalization allowed is cleanup of browser `contenteditable` artifacts, such as replacing non-breaking spaces with normal spaces and removing one browser-appended trailing newline. Do not trim meaningful spaces, internal whitespace, or challenge-authored newlines.

Challenge generation is deterministic, seeded, and template-based. No AI-generated challenges in MVP.

MVP templates should use concise productivity, developer, and casual workplace text. Track hidden error, skill-pack, and difficulty tags for analytics, but keep them out of the main active-test UI.

Challenge quality should optimize for making users feel good about using shortcuts. Default content should be approachable, repeatable, and satisfying, even if it sacrifices a little realism. Treat Monkeytype's default lowercase-word feel as the benchmark for approachability.

Skill packs should exist in the data model even when not exposed directly:
- Word movement
- Deletion cleanup
- Punctuation and casing
- Line reshaping
- Code cleanup
- Code refactor micro-edits
- Selection practice

Supported error families:
- Extra, missing, or wrong word
- Missing punctuation, capitalization, or apostrophe
- Double/missing space
- Extra/missing character
- Extra/missing newline
- Wrong word or character order

## 9.1 Difficulty

Supported difficulty levels:
- Standard: short single-line or simple edit flow.
- Advanced: longer text, more required edits, and more mixed skill tags.
- Multi-line: paragraph or block edits with meaningful newlines.

Difficulty affects generation, result buckets, personal bests, analytics, history filters, and settings. Multi-line difficulty preserves exact whitespace validation and starts the cursor at the end of the editable passage.

## 10. Drill Mode

Drill Mode trains atomic editing actions. The first MVP set includes:
- Delete previous word
- Delete next word
- Move previous word
- Move next word
- Select previous word
- Replace current word
- Insert punctuation

Drills validate by text, cursor position, selection range, or a combination, depending on the task.

Because drills are easier to damage accidentally, show a plain `reset drill` button below the active editing line during an active drill. It restores only the current drill text and starting selection. It must not reset completed parts or the run timer.

Platform-specific hints may appear after the idle timeout, but Drill Mode should not show persistent shortcut instructions by default.

## 10.1 Coding Mode

Coding Mode is part of the next MVP extension. It starts as Python-only.

Coding Mode asks the user to edit realistic but approachable Python snippets until the editable code exactly matches the target code.

Rules:
- Default language is Python.
- Validation is exact final text, including indentation and newlines.
- Do not validate final cursor or selection state in Coding Mode.
- Use deterministic Python templates, not AI-generated snippets.
- Include hidden skill-pack metadata such as punctuation, indentation, rename, boolean cleanup, argument cleanup, string cleanup, and simple refactor.
- Use a coding-themed editable box that fits the existing visual language.

Editor behavior:
- `(` inserts `()` and places the caret inside.
- `[` inserts `[]` and places the caret inside.
- `{` inserts `{}` and places the caret inside.
- Quote keys insert paired quotes when appropriate.
- Backspace on an empty pair removes both.
- Enter preserves indentation.
- Tab indents inside Coding Mode.

Non-goals:
- No syntax parsing.
- No linting.
- No formatting engine.
- No autocomplete.
- No multi-language support yet.
- No full IDE simulation.

## 11. Editor behavior

Use `contenteditable` for the designed editor surface. Keep canonical `currentText` in state and compare against that state, not display DOM.

The editor should:
- Focus automatically and recover focus after outside clicks
- Support cut, copy from editable text, paste, undo, and redo
- Disable spellcheck, autocorrect, and autocapitalize
- Keep target text non-selectable in normal UI
- Preserve keyboard navigation and mid-text editing

Caret:
- Native colored caret is acceptable for MVP.
- A custom caret may be added later only if it stays reliable with mid-text selection.

Diff and hints:
- After 5 seconds of no input, show the subtle hint/diff state together.
- Keep diff guidance near the active edit line.
- Do not block editing when the hint state appears.
- Do not add bulky explanatory panels during active typing.

## 12. Mouse policy

Default to keyboard-only.

Keyboard-only:
- Mouse placement/selection in the editor is blocked after the run starts.
- Initial focus before the first input does not count as mouse usage.

Mouse-allowed:
- Mouse movement and selection are allowed.
- Mouse actions are recorded.
- Results are bucketed separately and should be treated as casual metadata.

## 13. Scoring, timing, and results

The headline score is total completion time.

Timer rules:
- Run timer starts on the first run-starting input.
- Part timer may reset internally per part.
- Visible timer shows cumulative run time.
- Format: `MM:SS.d`.

Secondary stats:
- Keystrokes
- Hints used
- Mouse actions
- Clipboard actions
- Undo/redo counts when trackable
- Edits per minute
- Estimated correction count
- Skill tag summary
- Best skill category
- Slowest skill category

Personal bests are local-first and segmented by:
- Mode
- Part count
- Platform
- Mouse policy
- Difficulty
- Seed pack

Results screen:
- Large elapsed time
- PB badge when applicable
- Compact stat cards for the most important metrics
- Skill and difficulty summary
- Share-card preview
- Download card and play again actions
- Keyboard focus affordance for result actions

History view:
- Recent local runs
- Filters by mode and difficulty
- Personal bests
- Run detail with final text and share-card action
- Clear-history action with confirmation

## 14. Share card

MVP includes a downloadable PNG share card.

The card should show:
- Time
- Mode and part count
- Platform and mouse policy
- Key stats
- Brand
- Before/after text

For multi-part runs, use the full-run before/after text unless a later design deliberately switches to a representative pair. Keep the card readable and consistent with the active theme.

## 15. Persistence and logging

MVP is local-first.

Store in `localStorage`:
- Settings
- Result summaries
- Personal bests
- Recent run history

Detailed edit events may stay in memory unless persistence remains simple and small. Persist summaries and lightweight per-part metadata for analytics and history.

Keep result logging behind an interface so a backend can be added later without changing game logic.

No MVP login, global leaderboard, Supabase package, Supabase schema, or environment variables.

## 16. Platform handling

Supported MVP platform buckets:
- Mac
- Windows/Linux

On first visit, detect the likely platform, set it automatically, and let the user override it in settings.

Shortcut labels should be clear and compact. Symbols are fine for common Mac shortcuts, but plain text labels are acceptable when they improve readability.

## 17. UI and motion direction

Visual direction:
- Dark mode default, light mode usable, custom themes supported
- Minimal, focused, and Monkeytype-inspired
- Avoid dashboards during the test
- Avoid boxy line-by-line cards in the editor

Motion:
- Prefer consistent crossfades and subtle position changes.
- The active editing line should not jump vertically between parts.
- Target/prompt changes should be visibly animated.
- Drill transitions should be smoother than abrupt snap changes.
- Play again should crossfade back into the editor.

Sound:
- Optional, quiet, and minimal.
- Toggle in settings.

Themes:
- Settings include dark, light, and custom.
- Custom themes expose user-editable colors for background, panel, text, muted text, accent, success, error, and caret/focus if separate.
- Theme values are applied through CSS custom properties.
- Theme settings persist locally.
- Share cards use the active theme.

Keyboard shortcut map:
- Informational only.
- Platform-aware using the current platform setting.
- Actions are buttons labeled by command.
- Selecting an action lights up a mock keyboard and displays the shortcut sequence.
- Include word movement, word deletion, word selection, line start/end, undo/redo, copy/cut/paste, select all, and Coding Mode indentation.

Detailed settings:
- Mode
- Difficulty
- Part count
- Platform
- Mouse policy
- Theme mode
- Custom theme colors
- Coding language display set to Python only
- Smart pairs toggle for Coding Mode
- Sound toggle
- Reduced motion toggle
- Reset local data/history with confirmation
- Shortcut map entry point

## 18. Tech stack

Current MVP stack:
- Next.js App Router
- TypeScript
- Custom CSS with CSS variables
- Framer Motion for non-editor transitions
- Vitest
- Testing Library
- Playwright
- `html2canvas` for share-card export

Do not add Tailwind for the current MVP; the design uses direct CSS tokens and scoped CSS.

## 19. Data model notes

Keep these core models:
- `Challenge`
- `DrillDefinition`
- `CodingChallenge`
- `SelectionState`
- `TestConfig`
- `ChallengeResult`
- `TestResult`
- `PersonalBestKey`
- `ResultLogger`
- `ThemeSettings`
- `HistoryEntry`
- `ShortcutDefinition`

`TestConfig.challengeCount` is currently `3 | 4`. `TestConfig.difficulty` is `standard | advanced | multiline`. Coding Mode is Python-only for now.

`EditEvent` should capture key/input/selection/mouse/clipboard/hint events with timestamps, challenge IDs, before/after text, and selection state where available. It supports local analytics and future replay, not active UI clutter.

## 20. Backend and later features

Supabase is deferred. It may be useful later for anonymous aggregate results and analytics, but it should not block the playable MVP.

Later candidates:
- Anonymous result logging
- Aggregate stats
- Daily seeded challenge
- Replay timeline
- Custom challenge creator
- Additional coding languages
- Vim mode
- Browser/system shortcut training

## 21. Current locked decisions

- Product name: shortcutting
- Website target: shortcutting.xyz
- Default run: 3 parts
- MVP modes: Target Match, Drill Mode, and Python Coding Mode
- Default mouse policy: Keyboard-only
- MVP difficulty: Standard, Advanced, and Multi-line
- MVP includes downloadable share cards
- MVP is local-first
- Supabase is deferred
- No login
- No global leaderboard
- No AI-generated challenges
- Coding Mode is Python-only at first
- No Vim mode yet
- No browser/system shortcut training
