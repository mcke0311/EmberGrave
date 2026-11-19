# Live cinematics

The solo Sunderstone saga contains 20 scenes. The 17 campaign scenes plus one
chosen ending take 289 seconds. Scenes render the player's equipped hero in the
existing world, using authored cinematic poses, painted story props, captions,
installed music and synchronized sound. Revision 3 contains 85 directed shots
and 49 caption cues. In the playable opening, the camera and ground lighting
draw attention to the fallen guard, the Captain and Seraneth’s hearth. Movement
takes priority throughout.

## Scene inventory

| ID | Scene | Successful trigger | Seconds |
|---|---|---|---:|
| `oathsworn` | The Oathsworn Rise | Third beacon destroyed | 10 |
| `korvath` | The Oathbreaker | First eligible Korvath activation | 10 |
| `ledger` | Follow the Quiet | `q9` turn-in | 18 |
| `quieting` | The Quieting | Weeping Marsh with `q10` accepted | 20 |
| `mire_mother` | The Marsh's Embrace | First Mire Mother activation | 10 |
| `mire_shard` | A Gateway Beneath the Sand | Separate shard collection | 18 |
| `dig` | What the Quakes Uncovered | Dig Camp arrival | 18 |
| `ilyan` | The Imprisoned Archivist | Ilyan rescued | 12 |
| `azram` | The Gilded King | First Azram activation | 10 |
| `fortress_map` | The Suspended Fortress | Separate fortress map collection | 18 |
| `cathedral` | A Cathedral of Memories | Cathedral entry | 20 |
| `empty_archangel` | The Borrowed Voice | Activation after soul ward breaks | 10 |
| `malthoron` | The Hollow King | Activation after all cathedral requirements | 10 |
| `hell_portal` | Someone Else Guided Him | Valid unlocked Hell portal use | 22 |
| `breach` | The Breach | Breach arrival | 18 |
| `vethriss` | The Wounded Warden | First Vethriss activation | 20 |
| `core` | The Last Core | Vethriss defeated | 10 |
| `ending_destroy` | Destroy the Core | Destroy selected and saved | 35 |
| `ending_seal` | Seal It Away | Seal selected and saved | 35 |
| `ending_give` | Give It to Seraneth | Give selected and saved | 35 |

## Controls and accessibility

Every scene provides an immediately available **Skip scene** button and Escape
shortcut, including during asset loading. Completion and skipping share one
cleanup path. **Settings → Gameplay → Automatic cinematics** disables automatic
playback while unlocking reached scenes for later viewing. **Pause → Cinematics**
lists discovered moments, their transcripts and Replay buttons. Unchosen endings
remain locked. Keyboard focus stays inside the scene or library. The skip target
is at least 46px high and respects phone safe areas.

The operating system's reduced-motion preference selects one fixed view per stage and
restrained transitions/effects while retaining the physical story actions,
including the villagers walking into water. Hidden tabs
and a phone's portrait rotation gate suspend the cinematic clock. If cinematic
art fails or its loading times out, the transcript of dialogue and silent actions replaces the
presentation, with Continue/Escape and timed completion still available.

## Runtime and persistence

`js/cinematic_scenes.js` defines explicit shots, stage transitions, actor clips,
contact markers, caption intervals and audio cues. `js/cinematics.js` exposes `request(sceneId, context)`, `tick(dt)`,
`cancel(reason)`, `state`, `active` and render hooks. `request` resolves exactly
once with `completed`, `skipped` or `cancelled`. Campaign continuation callbacks
resume only after completion/skip in their original world and map. Travel, quit,
death or replacing the hero cancels obsolete continuations.

In solo play, gameplay time stops during presentation and library browsing.
Combat, hazards, projectiles, buffs, cooldowns and minions pause together. The scene
clock runs independently. Actors use render-only views. `js/cinematic_presentation.js`
samples actors, props and named effect intervals from absolute time. Each shot can
place its subject at a normalized screen position with `frame: [x, y]`. Shots cut directly
by default. An explicit fade marks a change of location. Cathedral islands and bridge layers assemble
without changing collision, navigation or the map seed. Input, camera, overlays,
owned sound sources and temporary music gain are restored through one cleanup path.
Native weather and environmental ambience use the presentation clock while the
simulation stays frozen. Reduced motion holds that ambience at a fixed frame.
Collected-object markers yield to staged props without changing the campaign map.

The world renderer projects terrain, culling, actors, shadows and effects at the
cinematic zoom. Its floor cache uses quantized world-pixel viewport bounds and
resets on cuts/seeks. A separate 768px hero renderer (512px on phone layouts)
preserves equipped models and active forms; core light illuminates their materials.
The film renderer also smooths face/hand contours and rounds starter boot toes,
with its own fill and rim lighting.
`js/character_cinematic3d.mjs` supplies grounded interaction/strike/recoil poses,
distance-based planted feet and weapon stowing. Props use live hand or form contact
anchors. Normal gameplay keeps its own renderer, equipment placement and clock.

Destroy has six shots: strained core (0–4), approach and final shard (4–9), two
contacts at 10.38/12.92, shatter at 14, cooling fragments/open fissures (19–27),
then a separate live Frosthaven approach (27–35). Seal switches to a guarded hidden
vault at 19, matching the position and scale of the enclosure on either side of
the cut. Give transfers the core at 11.5, changes Seraneth's eyes, closes her
portal and leaves a shadow behind. The Breach includes a separate animated
ash-wastes outlook. Malthoron’s portal frames the Burning Hells horizon above
the stone threshold of the Breach. On natural completion of The Last Core, the
hero holds the last pose. The choice panel uses the side of the frame away from
the core, including in the fixed reduced-motion view.

## Act I co-op

The Oathsworn and Korvath encounter events carry an event ID, an area and a
world position. Each viewer plays the same directed scene in a local copy of
that area with their own equipment and Wildkeeper form. Skipping, finishing or
disabling automatic playback acknowledges that viewer’s event. The worker owns
the area pause and the continuation. Early finishers see a waiting message
until the host releases the area. Other occupied areas keep advancing.
Disconnected viewers leave the wait set. At 45 seconds the worker releases any
remaining viewers by event ID and resumes the encounter once.

Replay constructs a separate map and hero presentation with the current class,
equipment and Wildkeeper form. That world is scoped to synchronous rendering;
loading never replaces the campaign's state. Replay cannot award loot, complete
quests, select an ending or save a hero. Production definitions contain no
progression writes.

`characterFlags.cinematics = {v:1, seen:{}, unlocked:{}}` belongs to the hero,
independent of difficulty. Unlocks are saved when a moment is reached. Completed
or deliberately skipped scenes become seen. Legacy video/illustration flags and
already-passed milestones across saved difficulty campaigns migrate on load,
avoiding a backlog for established heroes. Ending selection, its library unlock,
finale reward and difficulty unlock are saved before the ending starts. Loading
after an unchosen finale restores the three-choice prompt.

## Review and validation

Serve this checkout with `python serve.py`, then open
`tests/cinematics_review.html`. Its isolated in-memory store, scene/class/form/gear
pickers, two world seeds, timeline seeking, frame stepping, shot labels, caption hiding, playback,
pause, skip, reduced-motion and missing-asset controls cover all 20 scenes.
**Compare original** plays the frozen first-release catalog/director/CSS beside
the new direction. Hidden comparisons stop playing. A scene can be selected directly with
`tests/cinematics_review.html?scene=ilyan`. Real hero saves are never used.

Run `npm run test:cinematics` with Chrome and Playwright available. Set
`GAME_REVIEW_URL` when serving on a port other than 8741. On restricted Windows
hosts, use `node --preserve-symlinks --preserve-symlinks-main` for each test file.

- `cinematic_pose_contract.mjs`: all cinematic clips, classes and forms; independent
  sampling, planted feet, finite transforms and normal equipment restoration.
- `cinematics_contract.mjs`: 20 definitions, activation gates, freeze, duplicate
  triggers, natural completion, rapid skip, interruption, automatic-off behavior,
  difficulty-independent history, legacy saves and caption fallback.
- `cinematics_browser.cjs`: real rendering of every scene, five classes and four
  Wildkeeper forms, replay/save isolation, keyboard focus and durable choices.
- `cinematics_progression_browser.cjs`: actual beacons, quest rewards, separate
  shard/map recovery, Ilyan rescue, wards, portal continuation, interrupted-ending
  reload, library locks/transcripts and trusted touch on 844×390 and 568×320.
- `cinematics_direction_browser.cjs`: exact presentation-state equality after
  backward/forward seeking through all 85 shots, rendered-frame comparison with
  a small GPU/scenery blending tolerance, contact/cue timing, each ending-shot
  interruption, inward shard travel, pixel visibility through the Hell portal,
  real missing-atlas fallback and 54 class/form/gear/layout cases.
- `cinematics_review_browser.cjs`: timeline, stepping, stage switching, caption
  hiding, original comparison, form/gear pickers and storage isolation, plus
  the original campaign browser review.
- `cinematics_performance.cjs`: two alternating pairs on matching camera paths;
  ordinary zoom, matching-projection control and directed presentation at 844×390,
  1080p and 4K. Covers contact close shots, shatter, assembly and distant conflict.
  Reports CPU submission timing; it does not estimate phone FPS or GPU cost.

Browser screenshots and timing evidence are written to ignored `tmp/cinematics/`
and `tmp/cinematics-direction/`. To capture the immediate before-and-after
comparison, serve each revision in turn, set `GAME_REVIEW_URL` to that server
and run `node tests/cinematics_comparison.cjs before` or
`node tests/cinematics_comparison.cjs after` from the updated checkout.
Open `tmp/cinematics-overhaul/index.html` to compare 39 matched moments from
all 20 scenes with captions on or off, two map seeds and all three viewport sizes.
The co-op runtime and browser suites also exercise individual viewer completion,
automatic playback, disconnect and timeout.
The campaign and opening suites cover 239 story checks, 470 boss activation checks
and 1,140 opening checks. Touch playthroughs exercise the complete opening and
the Captain’s courtyard approach. A three-client co-op run covers different
completion times alongside an occupied Frosthaven.

The table compares CPU submission time in milliseconds on one Chrome host
using seed `7136411`. Each value is the mean of two runs. The projection column
uses ordinary rendering on the updated cinematic camera path. The complete
samples, including the ordinary gameplay camera, are in
`tmp/cinematics-overhaul/performance-before.json` and
`tmp/cinematics-overhaul/performance-after.json`.

| Viewport | Story beat | Before median | After median | After matching projection median | Before p95 | After p95 |
|---|---|---:|---:|---:|---:|---:|
| 844×390 | Contact close shot | 1.05 | 0.95 | 1.20 | 1.50 | 1.40 |
| 844×390 | Shatter peak | 1.20 | 1.20 | 1.20 | 1.75 | 1.75 |
| 844×390 | Island assembly | 1.40 | 2.80 | 3.45 | 2.00 | 3.80 |
| 844×390 | Distant conflict | 0.70 | 0.75 | 0.90 | 0.95 | 1.05 |
| 1920×1080 | Contact close shot | 0.90 | 1.00 | 0.95 | 1.25 | 1.35 |
| 1920×1080 | Shatter peak | 1.30 | 1.20 | 1.15 | 1.95 | 1.60 |
| 1920×1080 | Island assembly | 1.50 | 2.50 | 3.20 | 1.95 | 3.35 |
| 1920×1080 | Distant conflict | 0.80 | 0.70 | 0.90 | 1.15 | 0.95 |
| 3840×2160 | Contact close shot | 1.15 | 1.05 | 1.40 | 1.50 | 1.45 |
| 3840×2160 | Shatter peak | 1.40 | 1.40 | 1.30 | 1.80 | 2.20 |
| 3840×2160 | Island assembly | 2.50 | 3.35 | 3.85 | 3.10 | 4.40 |
| 3840×2160 | Distant conflict | 1.30 | 1.05 | 1.25 | 1.75 | 1.40 |

## Cinematic artwork

Five original transparent atlases were generated with the built-in `image_gen`
tool: `props`, `warden`, `people`, `walkers` and `warriors`. The 64 registered cells
include core/fracture parts, parchment, bindings, ward enclosures, portal layers,
debris, scholar/warden interactions, villager strides and Oathsworn awakenings.
Original RGBA PNGs are saved in `assets/cinematics/source/`; runtime lossless WebPs
are in `assets/cinematics/`. Exact prompt sets, identity references and output
paths are recorded in `assets/cinematics/prompts.json`. Rebuild encodings with
`python tools/build_cinematic_assets.py` (Pillow); no resizing or alpha removal.
Figure registration isolates connected silhouettes once during preload, retaining
feet/weapons that extend past grid boundaries and excluding neighboring figures.
