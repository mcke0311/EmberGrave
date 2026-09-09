# Act 2 painted boundary validation

## Baseline and art

The baseline archive `tests/fixtures/act2_boundaries_before.zip` captures the
source tree before this pass, including nested Three.js dependencies. It has
56 individually hashed source files and restores only into ignored review storage.
Existing image assets are shared; new art has a separate `a2boundary_` namespace.

The built-in image generator produced masonry, flat shoreline and rooted-bank
kits matching the existing cloister landmark. The first masonry image was
rejected for an opaque checkerboard and duplicate directions. The first shoreline
was rejected for a presentation background; its corrected raised-bank version
was rejected in gameplay because it looked like a fence. The flat bank replacement
and two directional corrections are retained with prompts and source hashes.

Twenty-eight complete modules are registered with measured sockets, uniform
scale, real alpha and lossless WebP packing. The sprite contract checks 224
conditions, including exact RGBA equality between canonical PNGs and packed WebPs,
source hashes, anchors, footprint scale and absence of magenta matte leakage.

## Layout, quests and rendering

- Boundary contract: 565,203 checks over 30 seeds for each of six locations.
  Every classified collision edge has exactly one segment; all segments match
  collision, masonry is distinct from water, and outdoor borders contain no masonry.
- Greywater Landing's collision, floor, props, NPCs, settlement data and shrine
  match the fresh baseline; all adventure travel rectangles and arrivals match.
- Adventure route graphs and encounter counts match the fresh baseline. Existing
  Act 2 layout checks pass 2,005,091 assertions over 30 seeds and cover protected arenas, reachability, safe arrivals,
  non-damaging scenic water and exploration loops.
- Quest contract: 103 checks, including legacy saves, ritual restoration,
  early boss kills, shard recovery, return travel, portals and shrines.
- Browser walk review: 102 successful walks, including both directions of all
  adventure routes and camp services/departure. Decorative camp road curves are
  not treated as navigation paths; the review uses actual pathfinding to services.
- Capture review: 184 matched images across all six locations at 1920×1080 and
  3840×2160, arrivals and every authored landmark. The first batch had no browser
  or resource errors. The final refresh retried one timed-out local artifact POST
  and still completed all 184 saves; final files were separately decoded and checked.
- Shared navigation: 216 pathfinding and 75,272 edge checks. Settlement layout:
  54,280 checks. Act 2 enemy contract: 257 checks. Projected terrain cache:
  3,985 checks, including boundary-record replacement; material cache: 16,407.
- Eight representative other-act maps hash identically to the fresh baseline.
- Pixel comparison: 20 scroll/rebuild cases across the five adventure maps at
  both resolutions; maximum channel error 1/255, no channels above that limit.
  The optimized source-crop wall renderer matches the previous clipped renderer
  in 120 opaque/faded cases. Camp ground uses one cached image draw per frame.

## Performance

The review records three alternating before/after pairs per zone and resolution,
90 warmup frames and 240 measured frames per workload, the full zone roster,
verified player/enemy attack exchange, real 3D player rendering, and stable warmed
terrain caches. Camp is measured walking only because it has no combat encounter.
These are synchronous CPU measurements, not GPU completion times.

Raw `profile_*.json` and the aggregate `performance_all_both.json` are retained in
`tests/qa/act2_boundaries/`. Any aggregate CPU p95 increase above 10% requires
investigation before the final result is recorded below.

The first timing pass identified per-frame camp shoreline painting and redundant
canvas save/transform/clip operations for each upright wall. The camp shoreline
was moved into `TownTerrain`'s existing cached surface, and static wall rectangles
now use direct source crops with the same pixel bounds. All threshold breaches
were scheduled for three additional alternating pairs. Initial reports remain
in `performance_initial.json` and `initial_profiles/`; follow-up rows use method
revision 202. Browser pixel checks were completed during the early follow-up,
so those early timing samples may include machine contention; they must not be
represented as clean isolated measurements.

The remaining 4K marsh-combat result was repeated with other checks idle (method
203): mean CPU p95 **8.40 ms before → 8.63 ms after (+2.8%)**. The consolidated
report retains original passing cases and substitutes the follow-ups for flagged
cases. All 22 zone/resolution/workload comparisons are now below the 10% review
threshold. Current measured mean CPU p95 ranges from **3.53–5.47 ms at 1080p**
and **4.10–9.10 ms at 4K**. Timings are machine-specific; the raw initial,
contended follow-up and isolated repeat remain available, rather than discarding
the slower measurements.

| Location | 1080p walk / combat p95 | 4K walk / combat p95 |
| --- | ---: | ---: |
| Weeping Marsh | 4.80 / 5.43 ms | 6.93 / 8.63 ms |
| Flooded Crypts | 4.33 / 4.90 ms | 7.27 / 9.10 ms |
| Hollow Reeds | 4.27 / 5.47 ms | 6.03 / 7.27 ms |
| Spawn Pools | 5.10 / 5.27 ms | 6.97 / 8.77 ms |
| Choir's Ritual | 4.70 / 5.23 ms | 6.30 / 8.13 ms |
| Greywater Landing | 3.53 / — ms | 4.10 / — ms |
