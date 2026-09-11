# Loot filter workshop

Open **Escape → Loot Filter** during play. Preset cards describe the four built-in
filters. Select a rule to edit its conditions, visibility, appearance and sound.
Rules run from top to bottom; the first match wins and unmatched items stay visible.
Editing a preset creates a custom copy. Switching presets keeps that custom copy
available through **Restore custom**. Changes save automatically on this device.

The preview evaluates eight illustrative drops using the real filter evaluator and
the current hero level. Reveal hidden samples to inspect filtered names. Unique,
set, quest and marked items, gold and scrolls are protected by the filter engine.
The preview is an example set, not an inventory or a prediction of future drops.

Undo restores the previous filter after edits, deletion, reset or import. Sharing
uses an inline JSON editor; invalid imports leave the active filter untouched.
The reveal-key button captures a key only while focused; Escape cancels capture.
Escape otherwise closes sharing or returns to the pause menu. Done resumes play.

Implementation: `js/loot_filter_ui.js`, `css/loot-filter.css`, and `js/lootfilter.js`.
The UI module is loaded before `js/ui.js` in `index.html`.

Validation:

- `node tests/loot_filter_contract.cjs`: matching, protection, appearance and atomic imports.
- Serve the repository on port 8766, then run `node tests/loot_filter_browser.cjs`.
  Override the origin with `GAME_REVIEW_URL` if needed. Uses Playwright and a fresh
  Chrome context with an isolated test hero; existing saves are not accessed.
- Browser report and responsive screenshots: `tests/qa/loot_filter/`.
