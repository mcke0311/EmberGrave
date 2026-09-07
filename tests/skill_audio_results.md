# Recorded skill audio verification

- `skill_audio_contract.mjs`: **1,288 checks passed**. All 78 shipped WAVs match
  their recorded provenance hashes, have usable signal and transient headroom,
  and cover 108 explicit identities. Decode caching, missing-file diagnostics,
  load/suspend behavior, mute, nested sources, cast rejection, release markers,
  lifetime cleanup, independent randomness and voice bounds passed.
- `skill_audio_gameplay_contract.mjs`: **6,348 checks passed across 963
  skill/rank/perk scenarios**, with the new audio module present. Frozen original
  gameplay, resource costs, damage, effects, cancellation and VFX-disabled
  equivalence passed. The frozen baseline was not regenerated.
- Browser skill studio: **all 107 skills passed** through the isolated combat
  arena. All 91 actives produced attributed audio; seven conditional passives
  have trigger accents and nine stat-only passives are silent.
- Browser real-audio checks: **16 passed**, including 78 real decodes, mute,
  suspension, source playback, handles, area-hit coalescing, the 24-voice limit,
  field expiry, rejection, disabled audio and complete tail cleanup.
- Actual production mixer rendered offline with **24 heavy critical impacts at
  maximum volume**: peak **0.699675 / −3.10 dBFS**, with all 24 voices admitted.
  This includes production material/accent layers, rates, compressor and output
  trim, rather than a separately approximated mix.
- Existing regressions passed: **14,698** skill/perk checks, **105** animation
  timing checks, **15,368** projectile-origin checks, **2,045** Wildshape
  transition checks, **85** player-death behavior checks, and **354** zone/boss
  music checks.
- Existing browser playback checks passed: **52** UI-click checks, **15** player
  death recording checks, and **115** soundtrack checks, including all 15 music
  recordings. Their save stores are isolated.

The audition studio provides individual releases/impacts, real combat, music
mixes and representative previous sounds. These controls support subjective
listening review; automated signal and behavior checks do not establish a
listener's timbral preference. No audio from an external service is requested at
runtime, and the supplied UI-click/death MP3s were not edited or transcoded.
