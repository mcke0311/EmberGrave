# Act IV painted environment overhaul

The four cathedral maps retain their seeded islands, connections, encounters,
campaign objectives, memory-cache behavior and floating-world setting. Their
presentation now uses 72 additional authored assets: four 16-piece environment
kits, four floor materials, and four matching floor-transition patches.

Pale gothic walls connect the Shattered Cathedral's architecture. Dark carved
masonry encloses the Heart's ritual rooms. Cinderwatch's ash-covered streets
end in natural rock; its boundary renderer never turns the outdoor contour into
a continuous wall. Bastion uses substantial fortress walls and broken foreground
defenses. All four have deep exposed foundations and bridge abutments. Foreground
walls fade for the hero without changing collision.

## Assembly and travel

`map.cathedral.version` is now 2. Its `environment` stores immutable classified
boundary segments, corners, gateway wings and bridge supports, with a `revision`
for explicit edits. Runs follow the actual void mask and are divided into at
most six-tile sections. Short sections crop painted modules; no module is
stretched to fill a run. The assembly cache uses metadata identity and revision.
The projected floor cache invalidates on both, in addition to material/void edits.

Foundation faces render before floors so their downward pixels cannot cover a
neighboring walkable platform. Upright modules use the existing actor depth list.
Openings and three-tile routes remain clear; the 21×21 boss reservations are intact.

All seven normal exit records use shared threshold metadata. Each threshold has
an opening, approach, arrival, solid flanking footprints and connected visual
wings. Opening and label clicks use the same geometry; the generic exit chevrons
are bypassed for these passages. Gates try clear perimeter sockets before using
a short platform extension. The supernatural arrival and Hell aperture retain
their identities. The latter still appears only after Malthoron's defeat and
keeps the original campaign travel requirements. Saves require no migration.

## Art provenance and rebuilding

Original kit sheets, refinement sheets, floor sheet, complete prompts,
registration records and source hashes are in
`assets/sprites_src/gameplay_art_authored/act4_environment/`. All paintings were
created with the built-in image tool using the existing cathedral library as
reference. The first sheets contained a baked checkerboard; refinement images
replace it with a technical magenta matte. The importer extracts and unmixes that
known matte into real RGBA, crops reviewed cells, trims empty margins and scales
uniformly. It does not paint new architectural detail. Packing preserves the
canonical pixels in lossless WebP.

Run `python tools/import_act4_environment.py` using a Python environment with
Pillow and NumPy. It updates only the `a4env_` declarations and refreshes the shared
manifests immediately before merging. The runtime sources are local project assets.

## Review and verification

Start `python tests/cathedral_server.py`, then open
`http://127.0.0.1:8744/tests/act4_environment_review.html`. The page has 112 paired
production views at 1080p and 4K, including every exit, all room landmarks and
both arenas. It links to the playable review and the asset contact sheet.

The before captures and three-sample performance baselines were taken from the
working files at the start of this change. The temporary code snapshot is in
`tmp/act4_environment/before/`; saved comparison images remain usable without it.
Use `node tests/act4_environment_browser.cjs after` to capture and profile again,
then `node tests/act4_environment_browser.cjs compare` to enforce the 10% median
and p95 CPU limit. Rebuild scene indexes with `python tools/review_act4_environment.py`.
On this Windows installation the Node commands need `--preserve-symlinks
--preserve-symlinks-main` and the bundled Playwright packages on `NODE_PATH`.

Recorded results:

- 400 maps / 3,680,001 layout checks: routes, corners, blocked void, deterministic
  variants, open passages, blocking gate flanks, reachable arrivals and arenas.
- 569 source/alpha/anchor/packing checks across the 72 new assets; all 306 checks
  on the original 30 cathedral assets also pass.
- 14 real mouse-input transitions: opening and nearby label for each exit.
- 33 production journey checks: completed objectives, cached parents/children,
  one-time cache rewards, regeneration and final portal reveal.
- 24 fresh/cached pixel comparisons, with material, void, boundary replacement
  and boundary revision invalidation checks in all four maps.
- 214 campaign, 85,616 boss, 75,272 navigation and 10,728 terrain-surface checks pass.
- All 16 performance comparisons pass, covering movement and combat in all four
  maps at both resolutions. Raw samples and comparison rules are saved in
  `tests/qa/act4_environment/performance.json`.

The general `terrain_view_cache_contract.mjs` still fails its existing
`north_wild` assertion that fixed actor positions must produce a foreground clip.
The same assertion fails against the saved terrain/map baseline (with a no-op
Act 1 ground-art hook to satisfy its partially authored module dependency).
This change does not alter that map or its occlusion algorithm. Act IV's own
browser pixel fixture checks fresh/cached rendering, scrolling, and material,
void, boundary-identity and boundary-revision invalidation separately.
