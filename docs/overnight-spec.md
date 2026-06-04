# shortcutting overnight spec

This spec defines one overnight Goal Mode task. It is an extension spec for the next build pass and intentionally adds features that the current MVP spec previously deferred, especially Coding Mode. Keep the existing app layout stable unless a new page or panel requires design work.

## Objective

Build objective, testable product systems that do not require subjective human-in-the-loop design judgment:

- Light mode toggle and user-editable custom theme colors.
- Stronger local analytics, results, and local history.
- Better challenge quality based on shortcut learning patterns.
- Difficulty settings, including multi-line edits.
- Python-only Coding Mode with smooth editor behavior.
- Keyboard shortcut map.
- More detailed settings.

Work one feature slice at a time. Do not move to the next slice until the current slice is implemented and tested with focused checks.

## Historical Non-goals

- This overnight pass originally excluded Supabase, login, global leaderboard, AI-generated challenges, Vim mode, browser/system shortcut training, and full IDE simulation.
- Supabase-backed accounts, progress, public profiles, and leaderboards are now active post-MVP work. See `docs/auth-progress-leaderboards.md`.
- Do not add Tailwind or a component library.
- Do not substantially redesign the existing main game layout.
- Do not make subjective visual-polish changes unless required by the new feature.
- Do not implement multiple programming languages yet.

## Product Principles

- Optimize for users feeling good about using shortcuts, even if some default content is simpler than fully realistic editing.
- Default challenges should be analogous to Monkeytype lowercase words: approachable, repeatable, and satisfying.
- Keep skill packs in the data model so future analytics and adaptive practice can use them.
- Keep all new persistence local-first.
- Theme changes should affect the app and share card.

## Feature Order

### 1. Theme System

Add light mode and user-editable custom theme colors.

Requirements:
- Settings include theme mode: dark, light, custom.
- Custom mode exposes editable colors for background, panel, text, muted text, accent, success, error, and caret/focus if separate.
- Persist theme settings in localStorage.
- Apply theme through CSS custom properties.
- Share card uses the active theme colors, not hardcoded dark-only styling.
- Existing dark theme remains the default.

Tests:
- Unit test theme persistence and defaults.
- Component test settings update applies theme tokens.
- Test share card receives active theme data or renders theme-dependent values through props/classes.

### 2. Analytics and Results

Improve result summaries without adding backend code.

Track and display:
- Completion time.
- Keystrokes.
- Hints used.
- Mouse actions.
- Clipboard actions: copy, cut, paste.
- Undo and redo counts when trackable.
- Edits per minute.
- Estimated correction count.
- Skill tag summary.
- Best skill category.
- Slowest skill category.

Requirements:
- Keep detailed event logging lightweight and local.
- Avoid replay timeline.
- Results should remain compact and readable.
- PB segmentation must include mode, part count, platform, mouse policy, difficulty, and seed pack.

Tests:
- Unit test analytics aggregation.
- Unit test PB key compatibility with difficulty and mode.
- Component test results render the new metrics.

### 3. Local History

Add a local history view.

Requirements:
- Store recent run summaries locally.
- Show recent runs with time, mode, difficulty, part count, platform, mouse policy, date/time, and key metrics.
- Filter by mode and difficulty.
- Show personal bests.
- Let user open a run detail view with final text and share-card action.
- Add clear-history action with confirmation.

Tests:
- Unit test history storage add/list/filter/clear.
- Component test history renders and filters runs.
- Component or E2E test clear-history confirmation.

### 4. Challenge Quality and Skill Packs

Strengthen deterministic challenge generation.

Requirements:
- No AI generation.
- Add skill pack metadata:
  - word movement
  - deletion cleanup
  - punctuation and casing
  - line reshaping
  - code cleanup
  - code refactor micro-edits
  - selection practice
- Add more templates that are concise, satisfying, and shortcut-friendly.
- Default Target Match should mostly use simple edits that reward common shortcuts.
- Templates must include hidden skill tags and difficulty metadata.
- Preserve seeded determinism.

Tests:
- Unit test deterministic generation by seed.
- Unit test challenge metadata exists for generated challenges.
- Unit test challenge pools can filter by mode, difficulty, and skill pack.

### 5. Difficulty Settings

Add difficulty levels:
- Standard: current short single-line or simple edit flow.
- Advanced: longer text, more required edits, more mixed skill tags.
- Multi-line: paragraph or block edits with meaningful newlines.

Requirements:
- Settings expose difficulty.
- Difficulty affects challenge generation, result buckets, PB keys, analytics, and history filters.
- Multi-line difficulty must preserve exact whitespace validation.
- Cursor starts at the end of the editable passage.

Tests:
- Unit test difficulty filtering/generation.
- Unit test PB/history keys include difficulty.
- Component or E2E test multi-line exact matching.

### 6. Python Coding Mode

Add a Python-only Coding Mode.

Requirements:
- Coding Mode is exact final-text validation, not cursor-state validation.
- Default language is Python.
- Coding Mode uses realistic but approachable Python edit templates.
- Include a coding-themed editable box using the existing visual language.
- Include skill packs such as punctuation, indentation, rename, boolean cleanup, argument cleanup, string cleanup, and simple refactor.
- Smart editor behavior only as needed for smooth play:
  - `(` inserts `()` and places caret inside.
  - `[` inserts `[]` and places caret inside.
  - `{` inserts `{}` and places caret inside.
  - quote keys insert paired quotes when appropriate.
  - Backspace on an empty pair removes both.
  - Enter preserves indentation.
  - Tab indents inside Coding Mode.
- Do not add syntax parsing, linting, autocomplete, formatting, or multi-language support.

Tests:
- Unit test Python template generation.
- Unit test exact validation with indentation and newlines.
- Component test smart pairs, Backspace pair removal, Enter indentation, and Tab indentation.
- E2E smoke test one Coding Mode run.

### 7. Keyboard Shortcut Map

Add an informational shortcut map.

Requirements:
- Accessible from settings or a dedicated panel.
- OS-specific based on platform setting.
- Commands include:
  - move previous word
  - move next word
  - delete previous word
  - delete next word
  - select previous word
  - select next word
  - line start
  - line end
  - undo
  - redo
  - copy
  - cut
  - paste
  - select all
  - Coding Mode indentation if enabled
- Each command is a button labeled by action.
- Clicking a command lights up a mock keyboard and displays the shortcut sequence in a separate line.
- Informational only; do not make this an interactive practice mode.

Tests:
- Unit test shortcut definitions by platform.
- Component test selecting a command updates keyboard highlight and display line.

### 8. Detailed Settings

Expand settings without cluttering active play.

Settings should include:
- Mode.
- Difficulty.
- Part count.
- Platform.
- Mouse policy.
- Theme mode.
- Custom theme colors.
- Coding language display set to Python only.
- Smart pairs toggle for Coding Mode.
- Sound toggle if still present.
- Reduced motion toggle.
- Reset local data/history.
- Link or entry point to shortcut map.

Tests:
- Component test settings persist and restore values.
- Component test reset local data/history requires confirmation.

## Validation Policy

After each feature slice:
- Run the focused unit/component tests for that slice.
- If source types changed, run `npm run typecheck`.
- If UI behavior changed, run the relevant E2E or add one before continuing.

At the end:
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e`

## Final Acceptance Criteria

- All listed feature slices are implemented or clearly marked as blocked with a concrete reason.
- Existing main game layout is not substantially redesigned.
- Existing Target Match and Drill Mode still work.
- Theme settings affect both app and share card.
- Results and local history show richer analytics.
- Challenge generation is richer, deterministic, skill-tagged, and difficulty-aware.
- Coding Mode supports Python-only templates and the defined smart editing behaviors.
- Shortcut map is informational, platform-aware, and keyboard-display based.
- All validation commands pass.
