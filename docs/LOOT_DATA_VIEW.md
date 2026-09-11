# Items and affixes data view

Open `loot.html` from **Items & Affixes** on the main menu, or from the data
editor. Run `python serve.py` and browse `http://localhost:8741/loot.html`.
The page reads current data and overrides without reading or writing hero saves.

- Search 494 item definitions, including 163 items with authored brown powers.
- Filter by item type and slot; compare source level, source type, and Magic Find.
- Compare Normal, Nightmare, and Torment percentages side by side. Enter the
  source level on Normal; the other columns apply the runtime's +30 / +60 level
  increments. The top difficulty selector controls sorting, eligibility filtering,
  and the selected item's source cards. Difficulty has no separate drop multiplier.
- Location details compare the same monster/container on all three difficulties,
  including 0% exclusions. CSV includes all three source levels and probabilities.
- Inspect full powers, supporting stats, set bonuses, standard zone/monster
  locations, difficulty, and named-item odds from one-time unique quest rewards.
- Browse 83 affix families / 369 tiers, including group restrictions, stat ranges,
  gear/category restrictions, weights, level gates, and first-draw probabilities.
- Export filtered item or affix data to CSV. Item exports include the scenario,
  full brown powers, and locations at the selected difficulty and Magic Find.

Item percentages mean **at least one copy per source action**. Gear uses
`1 − (1 − equipmentChance × namedItemChancePerAttempt)^attempts`, with the
three source-level offsets averaged before combining attempts. Base rows combine
common, enhanced, and rare outcomes, including rarity fallback. Unique/set rows
are separate. Socketables use the independent family/item selection path.

Location odds use each standard monster definition's clamped zone level and
difficulty increment, boss levels, chest level (zone + 1), and breakable level
(zone). They are conditional on the source existing; they do not claim monster
spawn rates, elite density, or farming time. Scripted encounters, special events,
rich chests, focused glyph rewards, vendors, and crafting are outside that list.
Boss-owned adds give no loot. Regular opening-road encounters are scripted and
excluded from the standard location list.

Affix percentages mean the chance of a particular family/tier on the first
draw for a selected base, not on a completed item. The page accounts for family
weights and the 60% top-tier / 40% uniform-tier blend. Later draws depend on used
groups, prefix/suffix limits, and stopping rules. Charm and jewel multipliers are
documented, including the runtime's omission of per-level scaling on those items.
Socket-grant prefixes are documented separately because they are not affix draws.

The only loot-runtime change exposes the existing source config as
`Items.DROP_CONFIG`; it does not change values or random call order. The analytical
model is checked against seeded runtime rolls so duplicated formulas cannot drift
silently. Load order matches the game: data, authored powers, then saved overrides.

Validation:

```powershell
node --preserve-symlinks --preserve-symlinks-main tests/loot_data_contract.cjs
node --preserve-symlinks --preserve-symlinks-main tests/loot_data_browser.cjs
```

Browser checks need Playwright, Chrome, and the running server. `NODE_PATH` may
point to the bundled dependency directory. Screenshots and browser results are
written to `tests/qa/loot_data/`. Contract checks cover 100,000 loot events across
ten scenarios, 30,000 first-affix draws, level exclusions, powers, and locations.
