# Act 2 normal and champion attack indicators

Status: **implemented and validated**, September 8, 2026.

Normal and elite/champion creatures in Act 2 no longer render attack warning
circles, lanes, landing/blast outlines, or circular impact rings. This includes
summoned creatures and boss-owned reinforcements using the original AI.
Classification does not depend on the animation toggle or combat profile.

Mire Mother, Vorthel, Choir Herald, Brood Mother and ritual structures retain
their indicators. Selection outlines and elite identification glows are unchanged.
Enemy poses, projectiles, slash arcs and non-radius particles remain visible.
Other acts do not opt into this presentation rule.

`Game.addNova(x, y, radius, color, {hideRadius:true})` optionally suppresses the
generic ring and styled area wave. Existing four-argument callers retain their
presentation. Styled particles and prop destruction still execute. Enemy-origin
calls use the classification policy; player-triggered corpse and status effects
retain their existing presentation. Warning records, shapes and release clocks
remain in the simulation.

The working-tree source was captured before this change in
`tests/fixtures/act2_indicators_before.zip` (45 files, SHA-256 hashes verified by
the contract). It includes the completed Act 2 animation work. The earlier
animation baseline and unrelated working-tree changes were preserved.

| Verification | Result |
| --- | --- |
| Indicator contract | PASS: 2,415 checks |
| Seeded combat baseline | PASS: 10,620 matching samples at 30 Hz |
| Combat coverage | Normal, elite, summoned and legacy-AI variants; Mire Mother; Requiem, sacrifice, rupture, splitting and summon cleanup |
| Environmental/reward coverage | Matching prop removal, blocked tiles, gameplay RNG, loot including item IDs, rewards and quests |
| Renderer coverage | Authored and generic warning renderers; impact rings; particles; boss/ritual classification; animation toggle; reduced motion |
| Act 2 combat suite | PASS: 257 checks |
| Act 2 quest suite | PASS: 103 checks |
| Shared skill VFX suite | PASS: 5,373 checks across 963 skill/rank/perk scenarios |
| Browser previews | PASS: 72 cases at 1920x1080 and 3840x2160, reduced motion on/off |
| Browser animations | All six frames retained for tested normal/champion melee, slam, lunge, dive, blink and rupture sequences; pause stable |
| Crowded combat | PASS: four 32-creature runs, both resolutions and motion settings; screenshots visually inspected; no game errors |

Browser reports and screenshots are in `tests/qa/act2_indicators/`. Crowd
update/render CPU medians were 3.5–4.2 ms in headless Chrome on this machine;
these are observations, not a GPU latency measurement or baseline speed claim.

The isolated review at
`http://127.0.0.1:8749/tests/act2_review.html?enemyReview&animationReview`
now includes a **Variant: Normal / Champion** selector. Select the variant,
stage an enemy, and preview an ability or death using pause, frame stepping or
slow motion.

Run the focused checks with:

```powershell
node --preserve-symlinks --preserve-symlinks-main tests/act2_indicators_contract.mjs
node --preserve-symlinks --preserve-symlinks-main tests/act2_indicators_browser.cjs
```

The browser check requires Playwright with Chrome and the isolated review server
on port 8749. The contract uses Python to verify and restore the immutable source
snapshot under the ignored `tmp/act2_indicators/before` directory.
