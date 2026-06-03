# Overnight Goal Mode Prompt

Paste this as the Goal Mode task:

```text
You are working in the shortcutting repository.

Goal: implement docs/overnight-spec.md completely as one overnight build task, working one feature slice at a time and testing each slice before moving on.

Read first:
- spec.md
- docs/overnight-spec.md
- current source under src/
- existing unit, component, and E2E tests

Finish line:
- Theme system: dark/light/custom, local persistence, CSS variables, share card uses active theme.
- Analytics/results: completion time, keystrokes, hints, mouse, clipboard, undo/redo, edits per minute, correction estimate, skill tag summary, best/slowest skill category.
- Local history: recent runs, filters by mode/difficulty, PBs, run detail, share action, clear-history confirmation.
- Challenge quality: deterministic, seed-based, skill-pack metadata, richer shortcut-friendly templates.
- Difficulty: Standard, Advanced, Multi-line, wired into generation, PB keys, analytics, history, and settings.
- Python-only Coding Mode: exact final-text validation, Python templates, coding-themed editor, smart pairs, Backspace pair removal, Enter preserves indentation, Tab indents.
- Shortcut map: platform-aware command buttons, mock keyboard highlight, selected shortcut display line.
- Detailed settings: mode, difficulty, part count, platform, mouse policy, theme/custom colors, Python language display, smart pairs, sound, reduced motion, reset data/history, shortcut map entry.

Constraints:
- Do not implement Supabase, login, global leaderboard, AI-generated challenges, Vim mode, browser/system shortcut training, full IDE simulation, autocomplete, syntax parsing, linting, formatting, or multi-language coding support.
- Do not add Tailwind or a component library.
- Do not substantially redesign the existing main game layout.
- New pages/panels may extend the current design theme using best judgment.
- Keep the MVP local-first.

Iteration policy:
- Implement in the exact feature order from docs/overnight-spec.md.
- After each slice, add/update focused tests and run the relevant focused tests.
- Do not move to the next slice until the current slice works and its focused tests pass.
- If a slice is blocked after repeated attempts, document the blocker and continue only if later slices can proceed without hiding the failure.

Validation:
After the final pass, run:
- npm run lint
- npm run typecheck
- npm test
- npm run build
- npm run test:e2e

Manual QA before final:
- Target Match still works.
- Drill Mode still works.
- Custom theme affects app and share card.
- Local history records and filters runs.
- Multi-line difficulty validates whitespace exactly.
- Python Coding Mode smart pairs, Enter indentation, and Tab indentation work.
- Shortcut map updates mock keyboard correctly.
- Settings persist after refresh.

Final response:
- Changed files grouped by feature slice.
- Tests/validation run and results.
- Any blocked or partial items with exact reasons.
- Known limitations.
- Manual QA notes.
```
