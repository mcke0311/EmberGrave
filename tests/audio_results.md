# Recorded soundtrack and UI sound verification

- `startup_music.html`: **115 checks passed** in the in-app browser. All fifteen
  configured music MP3s decoded and played; end-of-file looping, Master/Music volume,
  mute, title/class selection continuity, Acts I–V zone assignments, side areas,
  same-song position retention, rapid transitions, synthesized fallback and return
  to title passed. Only one cached player per track was created.
  Includes real playback of Caverns of Shadow, Cavern's Heart, Cave Echoes, and
  Hellscape Assault, with looping, volume, fades and no duplicate players.
- `zone_boss_music_contract.mjs`: **353 checks passed**. Every zone's music pool,
  fixed town/first-area themes, random selection without immediate repeats, actual
  map entry and update loop, miniboss/act-boss bars, overlapping bosses, retreat,
  boss death, player death, revival, zone changes and title handoff passed.
- `player_death_sound_contract.mjs`: **85 checks passed** after encounter music
  integration; fatal-hit audio and enemy behavior through death/revival passed.
- `ui_sound.html`: **52 checks passed** with the actual 1.81-second click MP3.
  First activation, single decode/fetch, one source per action, title/class
  selection, checkbox/name input, pack, attributes, quests, vendor inspection,
  right-click/keyboard selling, settings, disabled controls and typing passed.
  Audio graph inspection confirmed Sound Effects → Master → output routing.
  Music mute, Sound Effects mute, Master mute, rapid retrigger and suspended
  AudioContext recovery passed without a delayed burst or unhandled rejection.
- `management_ui.html?w=1366&h=768`: **50 checks passed**, covering transactions,
  full packs, equipment swaps, tidy/search, recipes, quests, stats and panel changes.
- `management_contract.mjs`: **897 checks passed**.
- Changed runtime JavaScript and browser fixture scripts passed syntax checks.

Browser fixtures override storage with separate in-memory stores. Real saves were
not accessed. Act numbering follows `DATA.ACTS`: Act IV has two cathedral combat
zones and no town. `infernalTown` is registered and playback-tested, awaiting a
town assignment; both current Act IV zones include `cathedral` / Infernal Silence
in their exploration pool alongside the three cavern tracks.
