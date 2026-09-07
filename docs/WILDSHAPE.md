# Wildkeeper visual refinement

The four live Three.js forms retain their gameplay footprint and existing
movement and combat rigs. Wolf has a tapered muzzle, silver ruff, separated
toes and a swept tail; Bear has a deeper chest, shoulder hump, tawny breast
and heavier claws. Stone has overlapping shale, carved brows, moss, roots
and luminous cracks. Apex has a broader branching crown, bark bindings,
shoulder thorns and a grove sigil.

Fur locks are flattened and swept, with directional surface grain. Rigid
detail is combined by material beneath each animated joint to limit draw
calls. Existing foot contacts and IK remain intact. Grounding now blends
through takeoff and landing, including the revised silhouette bounds.

## Transformation presentation

`js/character_wildshape3d.mjs` owns the transition sampler, controller and
effects. The source model gathers down, dissolves into the destination,
and the destination unfolds before settling into its current action.
This uses posed model deformation and a silhouette crossfade, not a
topology morph between incompatible human, quadruped and stone meshes.

Entry durations: Wolf 0.84 s, Bear 1.00 s, Stone 1.12 s and Apex 1.08 s.
Reverting uses the departing form's duration. Leaf spirals, a ground ring
and a restrained central glow share each form's palette; Stone sheds
angular fragments. Both model layers are rendered only during their overlap.
Human weapon grips remain solved while the torso gathers.

`Player3D.update` advances a per-player controller using simulation delta.
`Player3D.draw` only consumes its snapshot. Loading a character does not
replay a shift. Map changes and death cancel it. Rapid changes select the
dominant silhouette and preserve the corresponding skeleton's pose.
Controllers and frames live in WeakMaps and never enter saves.

Stats, mana costs, damage, action release times, input and movement apply
on their existing game timings. Presentation does not lock the player.

## Review and verification

Run `python serve.py`, then open
[the form gallery](http://localhost:8741/tests/character_forms3d.html).
Use Transform, Revert, Change beast, Pause and Transition progress to
inspect each transition. The facing and animation selectors also review
normal movement and combat. The gallery checks 2,112 visible, unclipped
frames across eight facings and all three transition paths.

`tests/wildshape_game.html` drives the real game loop with an isolated hero
and in-memory saves. It exercises actual form skills, reversion, immediate
gameplay effects, equipment restoration, repeated draws, rapid changes,
death cancellation and save isolation.

Regression commands:

```text
node tests/character_forms3d_contract.mjs
node tests/wildshape_transition_contract.mjs
node tests/player_motion_contract.mjs
node tests/character_animation3d_contract.mjs
node tests/player_animation_timing_contract.mjs
```

The existing `tests/character_game_integration.html` also passes its 150
checks for equipment transactions, all classes and forms, older saves,
mandatory 3D rendering and WebGL failure handling.
