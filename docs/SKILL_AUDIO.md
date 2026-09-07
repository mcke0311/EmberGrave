# Skill audio

Embergrave's five classes use recorded material textures: steel and shields;
combustion, ice and electrical cracks; bone and decay; bow tension and mechanical
traps; animals, roots and earth. The 78 mono PCM WAV cuts total about 4.7 MB.
Each skill has an explicit recipe in `js/skill_audio_catalog.js`, including basic
attacks, all 91 active skills, and all 16 passives. Related skills share textures
and use distinct material accents, weight and constant playback-rate settings.

Stat-only passives are silent. Heat Haze, Brittle Bones, Marrow Pact, Grave
Whispers, Soul Harvest, Kindred Bond and Primal Surge have small accents at their
actual conditional effects. No audio event changes gameplay timers, damage, saves,
or the gameplay random stream.

## Runtime

`Sfx.playSkill(skillId, phase, context)` supports `activate`, `release`, `impact`,
`sustain`, and `end`. Context includes `owner`, optional `emitter` and `target`,
the resolved damage `elem`, `crit`, and a passive `trigger`. Sustains require an
object emitter and return an idempotent handle with `stop()` and `active`.
`Sfx.stopSkills(owner?)` stops all skill voices, optionally belonging to one hero.

`SkillAudio.cast` buffers legacy activation cues until the skill succeeds.
Delayed actions emit at existing release callbacks. `SkillAudio.scope` restores
nested source identity in a `finally` block; projectile, field, minion and trap
audio keeps explicit ownership even with visual effects disabled. Dedicated hit
hooks carry actual contact and damage conversion. Existing skill-specific calls
to `Sfx.play` are translated only within this scope, preventing the former UI
clicks, chimes and simple synthesizers from also playing. Non-skill UI, music,
player hurt/death, loot and interaction sounds retain their existing paths.

The audio bank loads in the background after the first user gesture. Each cut is
fetched and decoded once. A missing cut is logged and skipped; missed events are
never replayed after loading or resuming. Skill loading does not delay the supplied
UI-click or player-death recordings. Sound Effects and Master control playback;
Music controls only music.

The skill bus uses a gentle compressor and a 0.7 output trim, bounded stereo placement, 24 admitted
voices, four instances of one cue, and six simultaneous sustained effects.
Each voice can contain a material and a quieter accent. Area contacts within
70 ms coalesce per emitter and skill; takes avoid immediate repetition and use
only ±1.5% random playback variation. The independent xorshift generator does not
consume gameplay randomness. Completed nodes disconnect and release ownership.

Channels, held bow draws and persistent fire/ground/cyclone fields sustain only
while their live emitter exists. Expiry, interruption, pause, death, respec,
loading, leaving play and map changes stop their sounds. Form reversion has a
short ending cue. Ordinary stat buffs do not have continuous hums.

## Authoring

Sources and licenses are in `assets/sound-effects/skills/CREDITS.md`; exact hashes
and cut recipes are in `sources.json`. The source packs are CC0, including their
use as modified layers. The existing click/death files have not been transcoded.

Run `python tools/fetch_skill_audio.py`, then run `tools/build_skill_audio.py`
using a Python environment with NumPy and SoundFile. These tools are offline
authoring dependencies only; the game remains vanilla JavaScript with no build
step. `tools/create_skill_audio_catalog.py` recreates the explicit identities from
the reviewed skill list, with independently authored audio families and accents.
The shipped runtime does not read or depend on the VFX catalog.

## Review and checks

Open `http://localhost:8741/tests/skill_audio_review.html`, enable sound, choose a
class/skill and replay it. Separate release and impact auditions, a frozen
previous-sound reference, two music backgrounds, rank/perk choices, visual-effect
toggle, pause and stepping are available. The arena uses temporary heroes and an
in-memory save store. Audio checks inspect real browser decoding, suspension,
mute, source limits, cleanup and an offline-rendered dense mix. The full skill
audit executes every active skill in the actual arena and audits silent passives.

`node --preserve-symlinks --preserve-symlinks-main tests/skill_audio_contract.mjs`
checks files/provenance, all assignments and phases, caching, failures, rejected
casts, delayed markers, nested ownership, randomness, voice bounds and lifetimes.
`tests/skill_audio_gameplay_contract.mjs` runs the existing 963-scenario frozen
gameplay baseline with the audio module present, including VFX-disabled cases.

Retain the skill/perk, VFX, animation timing, projectile origin, Wildshape,
player-death, UI-click, and soundtrack checks. Do not regenerate gameplay
baselines to accommodate presentation changes. Timbral preference is assessed
through the studio's listening controls, separately from the numerical checks.
