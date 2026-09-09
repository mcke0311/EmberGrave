# Act 2 entrance and exit validation

This pass replaces both sides of the five Act 2 travel connections. The baseline
is the working tree immediately before this entrance pass, including the completed
painted boundary work. The archive is `tests/fixtures/act2_thresholds_before.zip`.

## Reproduce

Run commands from the repository root. Python needs Pillow and NumPy; the browser
runner needs Playwright and Chrome. On the Windows bundled Node runtime, use
`--preserve-symlinks --preserve-symlinks-main` if the user profile junction requires it.

```text
python tests/act2_threshold_baseline.py
python tools/import_act2_thresholds.py
python tests/act2_threshold_sprites.py
node tests/act2_threshold_contract.mjs
node tests/act2_layout_contract.mjs
node tests/act2_quest_contract.mjs
node tests/act2_boundary_contract.mjs
python tests/act2_threshold_server.py
node tests/act2_threshold_browser.cjs --all
python tests/act2_threshold_capture_files.py
node tests/act2_threshold_interaction.cjs
node tests/act2_threshold_profile.cjs
```

Performance investigation commands (retain the first report as
`performance_initial.json` before repeating its flagged cases):

```text
node tests/act2_threshold_profile.cjs "profile&all&bothWidths&clean&investigate"
node tests/act2_threshold_attribution.cjs
node tests/act2_threshold_sustained.cjs
node tests/act2_threshold_sustained.cjs --control
node tests/act2_threshold_sustained.cjs --ablation
```

Open `http://127.0.0.1:8753/tests/act2_threshold_review.html?zone=drowned_crypt&view=exit_0`.
The review has an isolated in-memory save store and does not change player saves.
Select a Passage view to compare the corresponding endpoint in each version.

## Assets and geometry

Eight accepted built-in ImageGen sources produce twelve registered modules:
four complete arches and four paired bank/pier assemblies. Native alpha is retained
for the monastery exterior. The other accepted sources use a technical magenta
matte, decoded by the existing deterministic importer. Haloed variants were rejected.
Each disconnected bank/pier is imported as a complete silhouette. The reed return
right cell excludes a neighboring bank's detached root fragment; it does not trim
the selected bank. Registration preserves the measured foundation and connections,
uniform scale, source hashes, exact prompts, and lossless packed RGBA pixels.

The initial crypt and reed scenes exposed an entrance wing gap, a wall visible
across the aperture, and a path that bent before its clickable approach. The final
assembly uses overlapping short wall connections, a wider recess behind the arch,
and a straight initial approach. Rear wall joints sort behind the threshold art.
Flat boardwalk/paving approaches are baked into the existing terrain caches.
Final 4K review also caught a short plank gap at a reed approach bend. Overlapping
whole boardwalk sections now reach the route node exactly; captures were refreshed.

## Checks

Final threshold placement: **2,029,330 assertions passed**, including 300 endpoint
instances and exact isolation of eight representative other-act maps. Boundary
compatibility: **571,594 assertions passed**. The existing layout and quest suites
also passed (1,990,551 and 103 assertions respectively). All twenty interaction
cases, 156 capture-file checks, and 138 sprite/provenance checks passed.

- The threshold contract covers 30 seeds per adventure area and Greywater Landing,
  ten endpoints per seed, deterministic metadata, supported openings/approaches/
  arrivals, collision on supports, route and quest preservation, encounter budgets,
  protected combat/boss spaces, and non-damaging scenic water.
- Existing Act 2 layout and quest contracts cover the complete route network,
  quest progression, legacy ritual saves, portal/shrine travel, and death/revival.
- Twenty browser interaction cases exercise the actual hover and click handlers:
  opening and destination-label clicks at every endpoint, walking to the approach,
  correct destination/spawn key, and no automatic transition while standing inside.
  All ten opening clicks start ten tiles away; labels are tested near the approach.
- 156 matched scene captures cover all ten endpoints at 1920×1080 and 3840×2160:
  arrival, hover, foreground occlusion, and combat (camp combat omitted). Camera
  placement follows each version's corresponding approach because entrances move.
- Sprite checks compare imports rebuilt from source, canonical PNGs and packed WebP
  pixels, check transparent apertures, source hashes, matte removal, and registration.

Other tasks were concurrently updating other acts in this shared workspace. Their
changes are preserved. Isolation compares a snapshot of the current other-act code
with only the Act 2 threshold generator disabled; it does not compare their new
layouts to the earlier whole-workspace archive. Current-source snapshots prevent
edits during the long seed run from invalidating that comparison.

## Performance

The performance runner uses three alternating before/after pairs per workload,
90 warmup frames and 240 sampled frames, the production renderer and 3D Vanguard,
verified walking or exchanged attacks, and a separate warmed-cache stability check.
It covers walking in all six locations and combat in all five adventure areas at
both resolutions. A CPU p95 increase over 10% is investigated separately.

All 22 initial workloads retained stable warmed terrain caches. All eleven 1080p
comparisons passed the 10% limit. Four 4K cases were flagged; fresh alternating
pairs cleared the marsh walking/combat and ritual combat spikes.

**Remaining performance limitation:** Spawn Pools combat still exceeds the limit.
The longer uninstrumented ABBA run (240 warmup, 960 measured frames per sample)
measured **11.25 ms before / 12.85 ms after CPU p95 (+14.2%)**. A control using the
current shared renderer with only Act 2 generation restored measured **10.75 /
12.40 ms (+15.3%)**, so concurrent renderer changes do not explain it. Simulation
attack counts match and these stationary combat samples build no terrain caches.
The targeted investigation is complete, but this regression has not been fixed.

Instrumentation split simulation, rendering and Canvas image submissions; it did
not reveal a consistent additional expensive stage. Hiding only the new upright
threshold props also failed to isolate a repeatable cost (9.80 ms hidden versus
9.55 ms visible p95 in ABBA order). Absolute timings vary substantially between
runs. Those diagnostic results are retained rather than substituting their lower
numbers for the failed acceptance benchmark. Further optimization should start
with a controlled trace of Spawn Pools' 4K renderer, not changes to navigation or
smaller/clipped artwork.

Machine-readable results and full-resolution images are in
`tests/qa/act2_thresholds/`. `delivery.json` distinguishes functional PASS from the
remaining performance REVIEW. Initial reports, raw samples, repeated comparisons,
instrumentation, sustained runs and the control/ablation results are all retained.
