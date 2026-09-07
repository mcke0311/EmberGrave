# Player animation refinement

The five human classes and four Wildkeeper forms use the existing geometry and
equipment with revised motion. There are no new runtime dependencies or build
steps. This improves motion quality within the current procedural models; it
does not replace them with production character sculpts or motion capture.

## Review

Run `python serve.py`, then open
[the animation comparison](http://localhost:8741/tests/class_animation_styles.html).
Enable **Show baseline** to compare the saved original renderer and the refined
renderer at the same time. The fixture is frozen under
`tests/fixtures/animation_before/` and is loaded only by review/tests.

The gallery covers nine rigs, all eight original states, held draw/channel,
charge/spin, airborne poses, and a twelve-second movement/combat/death sequence.
Use quarter speed, frame stepping, front/side/back views, field/veteran/mythic
equipment, contact rings, and gameplay-sized rendering. **Save comparison PNG**
creates a full-resolution image preview and a download link for the displayed
before/after boards.

## Motion and ownership

`createAnimationController()` in `js/character_motion3d.mjs` owns simulation
history. `Player3D.update(player, dt)` updates a non-enumerable controller on the
player once per game tick, after movement and incoming damage. Renderers only
consume snapshots. Repeated views, equipment preparation, and afterimages do
not advance the live player's animation.

The compatible pose envelope remains `{ state, t, ang, ex }`. Optional
`ex.animation` carries ground contacts, gait phase, filtered speed, turn rate,
acceleration lean, secondary-motion lag, landing compression, action identity,
release markers, reaction direction, and a transition source snapshot. Existing
preview callers without that context sample deterministic standalone poses.

Contacts lock in the same ground coordinate system as the game's isometric
projection. Swing feet lift and travel to their next support position. On a
stop, lifted feet settle and feet step back into a comfortable stance one at a
time. Leg IK lowers the pelvis within reach; it does not stretch the skeleton.
Footstep audio follows contacts, with simultaneous paw contacts combined into
one sound. Hops suspend foot locking. Transitions into and out of flight blend
the solved leg poses, avoiding a switch back to unsolved joint angles.

Vanguard keeps a disciplined gait; Witch stays poised; Gravebinder shuffles;
Wildkeeper carries broader weight; Ranger uses low footwork. Wolf moves through
walk/trot support patterns, Bear has staggered four-foot contacts, Stone Form
uses deliberate bipedal steps, and Apex has a longer predatory stride. Each form
has its own strike, cast, reaction, and collapse. Cloth panels, cape, hair
attachments and tails have restrained deterministic follow-through.

Controllers reset on loading a new player, changing map/form, explicit blinks,
afterimage travel, debug teleporting, and discontinuous position changes. No
controller state or reaction history is added to saves.

## Gameplay timing

`Player.startAction` adds visual identity and the simulation start timestamp.
`afterActionDelay` records a normalized release marker while forwarding the
original delay and callback unchanged. The controller uses simulation time so
actions begun before or during a player update do not acquire different visual
timing. Immediate releases, including a held shot's release, start at contact.
The animation sampler also supports multiple release markers.

Traveling cracks, delayed meteor impacts, and chained world explosions remain
world effects; they do not make the caster repeatedly re-wind a gesture. Damage,
projectile creation, movement, cooldowns, action durations, input gating, and
hit pauses retain their existing behavior. Hurt and block presentation uses
additive visual reactions, never a replacement gameplay action.

## Two-handed weapon grips

Bows use an open archery stance, an extended support arm, a cheek-level draw,
and a drawing elbow that stays back. The string and arrow nock travel together;
the bow limbs flex under tension. At release, the string returns immediately
while the drawing hand follows through before recovering. Held shots retain
the full draw until their existing release event.

The bow raises before drawing, and the torso turns with the drawing hand.
The drawing elbow travels in front of the body while the hand is low, then
lifts into the anchor. Recovery returns the hand forward before lowering the
bow. Interrupted draws blend along a raised arc with a smoothly changing elbow
direction, preventing the forearm from cutting through the chest.

Crossbows use a trigger-hand grip and an under-barrel support hand, rise to a
level aim, recoil at release, and recock during recovery. The bolt disappears
at the existing projectile marker. The hand, string, and bolt are separate
visual parts; this does not introduce a gameplay reload delay.

Arrows now spawn at the animated bow rest or crossbow rail socket. The release
sampler uses the live action clock, including immediate held shots, without
advancing animation history or relying on the last preview/rendered model.
Socket position includes facing, class proportions and actor scale. Shots retain
their launch height, including terrain elevation and jumps, as they travel;
their drawn direction follows the isometric velocity. All weapon-arrow skills
share this spawn path, including fans, piercing shots and ricochets.

Staffs and spears have the support grip ahead of the dominant hand. Their
guards, casting gestures, and thrusts are authored in the character's facing
frame so chest rotation cannot sweep the rear shaft through the torso. A shared
weapon reach constraint keeps both wrists within the existing arm lengths,
including interrupted actions and falls. Pose sampling resets every moving
weapon part, preserving deterministic previews and afterimages.

## Verification

Run from the project root:

```text
node tests/character_animation3d_contract.mjs
node tests/character_forms3d_contract.mjs
node tests/player_motion_contract.mjs
node tests/player_weapon_pose_contract.mjs
node tests/weapon_projectile_origin_contract.mjs
node tests/bow_arm_clearance_contract.mjs
node tests/player_animation_timing_contract.mjs
node tests/navigation_contract.mjs
node tests/player_death_sound_contract.mjs
node tests/three_character_contract.mjs
node tests/player_animation_benchmark.mjs --write
```

The animation contracts cover every class and weapon family, exact grips,
grounding, loop endpoints, corpses, finite transforms, and deterministic
scrubbing. New checks cover planted-foot drift, stop/start, reversals, repeated
attacks, held release, channel interruption, takeoff/landing, reactions,
teleports, death, render-order isolation, and 30/60/120 Hz consistency.

The weapon-specific contract adds 460,804 checks over all five classes, field
and mythic outfits, base and held/traversal states, and interrupted actions.
It checks shaft clearance against pelvis/spine/chest armor envelopes, exact
wrist attachment, a 0.58-unit full bow draw, bow-tip/string/nock alignment,
independent hand follow-through, crossbow recocking, release visibility, and
render-order isolation. The closest sampled shaft remained outside the armor
envelopes; maximum measured wrist error was below 0.000001 units.

The bow arm-clearance regression adds 873,600 checks for both upper arms and
forearms against a torso envelope expanded for sleeve/bracer thickness. It
covers all classes, field/mythic outfits, eight facings, complete clips,
repeated releases, and seven interrupted-action combinations. The shoulder
socket region is excluded because it joins the arm to the torso.

The projectile-origin contract checks socket projection against an independent
camera across all classes, both weapons, base/mythic gear, 16 facings, release
markers, elevation and jump offsets. It also checks stale animation snapshots,
render-order isolation, fan origins, aim, speed and target hits. Open
`tests/weapon_projectile_origin.html` for rendered checks and a frame-by-frame
gallery of ordinary and charged releases.

The timing regression executes both original and revised Player code and
compares accepted skills, action durations, scheduled callbacks, and resulting
event order/timestamps across 25 skill/ranged cases plus held-shot release.
The browser integration page `tests/character_game_integration.html` passed
150 checks covering all classes/forms, equipment transactions, afterimages,
old saves, and save/reload using an isolated in-memory store.
The full armory browser contract also passed 46,100 rendered checks across all
five classes, twelve weapon families, eight base states, eight directions and
six timeline samples, including GPU resource disposal. The form gallery passed
768 visibility/clipping checks across twelve states and all eight directions.

Recorded maximum planted-foot drift is 0.0191 model ground units per frame
(about 0.84 screen pixels at ordinary actor scale); maximum IK target error is
0.0247 units. Exact two-hand grip error remains below 0.000001 units.

The saved `tests/player_animation_performance.json` measures nine equipped rigs
per batch with controller updates and skeleton evaluation included. After
warmup, alternating baseline/refined runs recorded p95 costs of 1.089 ms and
0.979 ms respectively, a 10.1% reduction on this machine after the weapon-grip
follow-up. It excludes GPU
rendering and does not claim a whole-game frame-rate improvement. The main
optimization updates only the affected arm branch during IK rather than
repeatedly updating the entire skeleton and its equipment.
