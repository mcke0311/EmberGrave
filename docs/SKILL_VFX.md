# Skill effects

`js/skill_vfx.js` assigns presentations to all 91 active skills and 16 passives.
The game still runs directly from `index.html` with the existing local server;
there are no new dependencies, generated build steps, or saved settings.

## Presentation

- Vanguard uses weapon ribbons, directional fractures, metal fragments, linked
  harpoon chains, charge debris, and cloth banners with ground auras.
- Ember Witch uses cached translucent flames, faceted ice, branching lightning,
  descending meteors, and separate inferno, glacier, and static-field silhouettes.
- Gravebinder uses bone gathering, spectral streams, curse glyphs, poison
  splashes, and visible contagion transfers. Bone Armor follows its live shield.
- Veil Ranger uses tapered arrow wakes, charged releases, falling arrows,
  mechanical traps, shadow snapshots, and marked-target payoffs.
- Wildkeeper uses companion arrivals, totem pulses, cyclone debris, ground
  fractures, and material cues for each of the four forms.

Every skill has an explicit material/motif assignment. Shared components use the
skill's actual projectile behavior, resolved area, duration, and release markers.
Passive accents are small and conditional on relevant attacks, movement,
defensive reactions, companion arrival, corpse use, or existing procs.

## Runtime contract

`performSkill` adds preparation only after successful activation. Existing
`afterActionDelay` callbacks emit releases, while actual damage callbacks emit
impacts. `sourceSkill` follows projectiles, traps, fields, summons and sustained
actions. Nested `scope` calls restore the previous source, including secondary
detonations. Gathering and plague-transfer hooks run at the existing gameplay
events. Buff and field renderers read their actual remaining duration.

`Player3D.effectAnchors` reads hand and weapon positions from the authored pose.
All projectiles in one release share its sampled pose. Trails sample over time;
magic's initial visual offset converges to its unchanged projectile trajectory.
Arrows retain their existing socket and lift. The current checkout has a
**3D-only player renderer**: the review preserves it, including the four animated
Wildkeeper forms and sprite companions. During a form blend or unavailable pose,
effects use facing-relative anchors. This change does not restore the removed
legacy sprite-player renderer.

VFX has a separate xorshift random stream. Its drawing methods read simulation
state; they never emit particles or consume gameplay randomness. Legacy
render-time projectile jitter and corpse emission have likewise been removed
from the draw loop. `Game.addNova` still destroys nearby breakable props and is
used only at existing gameplay events. Cosmetic `SkillVFX.area`, `beam`, and
`transfer` never call that helper.

Ground effects, depth-sorted elevated effects and small light stamps use the
existing terrain projection and foreground clipping. The hostile warning pass
remains in place. Cached flame/glow stamps avoid per-particle blur. A blink
snapshots the existing player once; ordinary rendering does not copy WebGL
canvases for afterimages.

Limits are 520 new particles (further reduced to fit a 700-particle allowance
alongside legacy particles), 96 temporary events, 12 samples per projectile,
8 weapon-trail samples and 12 ghosts. Emission density drops under pressure;
offscreen decoration is culled. Persistent area boundaries are drawn from live
fields and do not compete for the temporary-event pool. Reset clears transient
events and weak references on death, respec, map transition, loading and review
replay. The runtime adds no screen shake.

## Review

Run `python serve.py` and open `/tests/skill_vfx_review.html`.

The isolated page uses temporary heroes and an in-memory replacement for local
storage. It offers all 107 skills, replay, pause, frame stepping, quarter speed,
ranks 1/5/10, independent rank-5/rank-10 perks, bright snow and dark crypt stages,
and an effects toggle. It equips the real starter loadout. Passive previews
include a relevant active skill and a small trigger accent.

- `?audit=1` exercises every skill and produces five labeled contact sheets.
  Each sheet ends with a four-frame sequence for a representative skill.
- `?before=1&audit=1` loads the frozen original combat/presentation code from
  `tests/fixtures/skill_vfx_before`, using the same arena and hero equipment.
- `?benchmark=1` runs paired 1080p spell spam with effects off/on and seeded
  gameplay randomness; `?wide=1&benchmark=1` uses 3840 × 2160.
- `?stage=crypt&class=emberwitch&skill=emberwitch_0_4` opens a dark meteor preview.
- `tests/game_performance.html?vfxbefore=1` runs the existing map fixture with
  the original code; omit that parameter for the current version. `?wide=1`
  selects 4K. `vfxrecord=1` optionally sends results to the local QA collector.

The optional `tests/skill_vfx_collect.py` receives local review evidence on port
8742 and writes only allowlisted files in `tests/qa/skill_vfx`. Its absence does
not stop the review. Captured artifacts in that directory are sufficient
to inspect the captured results without it.

## Verification

`node tests/skill_vfx_contract.mjs` covers all 107 assignments, 963 rank/perk
scenarios against frozen original snapshots, enabled/disabled equivalence,
12-second live actor scenarios, rejected casts, cancellation, respec, cleanup,
resource bounds, finite drawing coordinates, RNG isolation and destructible
props. The baseline fixture must not be regenerated to accept gameplay changes.

Also retain the existing perk, animation timing, projectile-origin, character
animation, Wildshape transition/forms and terrain rendering contracts. On a
Windows installation that restricts Node's parent-directory realpath checks,
use `node --preserve-symlinks --preserve-symlinks-main tests/<name>.mjs`.

Measured results and captured comparison sheets are in
[`tests/qa/skill_vfx/REPORT.md`](../tests/qa/skill_vfx/REPORT.md).

