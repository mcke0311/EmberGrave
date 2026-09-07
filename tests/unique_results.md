# Unique overhaul verification

- 1,979 power checks cover all 162 items and 168 mechanically distinct powers, all five classes, real combat triggers, cooldowns, equipment removal, companion ownership (including reflected damage), fractional damage over time, and save migration.
- 8,788 loot checks cover source probabilities, increasing Magic Find, level eligibility, requested slots, glyph reforging, Runed Stones, and the seven preserved quest milestones.
- Seeded samples of 15,000 events per source: bosses **20.37%** with a Unique versus **20.15%** expected; elites **3.96%** versus **4.08%**; chests **4.10%** versus **4.05%**. Normal enemies and barrels also fall within their statistical tolerances.
- Existing skill, management, gameplay input, campaign, boss and item-art contracts pass. The skill suite runs with the Unique runtime installed.
- Chrome checks all 162 production tooltips and an item with four Unique glyphs at 1280×720. No clipped text, missing resources, or browser errors. Tooltips widen when necessary and position immediately under reduced-motion settings.
- Screenshots and the complete layout report are in `tests/qa/uniques/`.

Repeat with `node tests/unique_validation.mjs --browser`. The browser harness uses isolated in-memory saves and does not touch existing heroes. Browser validation uses installed Chrome and Playwright (the bundled Codex runtime is supported).

This verifies implementation and the initial drop balance. Long-term build balance remains a playtesting judgment; rates are explicit constants and every named power is documented in `docs/UNIQUE_ITEMS.md`.
