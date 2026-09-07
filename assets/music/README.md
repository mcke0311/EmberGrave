# Recorded soundtrack

Keep game music files in this folder. Runtime track definitions are centralized in
`js/audio.js`; zones identify their regional recording with `musicTrack`.
Towns/camps and first outdoor areas (`fixedMusic`) keep their dedicated theme.
Other zones randomly choose a cavern track or their regional recording on entry,
excluding the previous zone's selection.

| File | Use |
| --- | --- |
| Black Rune Oath.mp3 | Main menu and character selection |
| Snowy Mountain Vigil.mp3 | Frosthaven, Act I town |
| White Breath, Iron Sky.mp3 | The Fallen North; regional option in later Act I areas |
| Dusk in the Empty Town.mp3 | Act II town: Greywater Landing |
| Ash Dune Cathedral.mp3 | The Weeping Marsh; regional option in later Act II areas |
| Dusk in the Demonic Jungle.mp3 | Act III town: The Dig Camp |
| Sombras del Infierno.mp3 | The Shifting Wastes; regional option in assigned Act III dungeons |
| Infernal Silence.mp3 | Regional option in both Act IV cathedral zones |
| Infernal Town at Dusk.mp3 | Registered as `infernalTown`; awaiting a town destination (Act IV currently has no town) |
| Ancient Tower.mp3 | The Cinderfields; regional option in The Cinder Bastion and The Throne of Cinders |
| Tour de Pierre Vieille.mp3 | Act V town: The Breach |
| Caverns of Shadow.mp3 | Random exploration option beyond towns and their first outdoor areas |
| Cavern's Heart.mp3 | Random exploration option beyond towns and their first outdoor areas |
| Cave Echoes.mp3 | Random exploration option beyond towns and their first outdoor areas |
| Hellscape Assault.mp3 | Any engaged boss or miniboss with the large health bar |

These are the original supplied MP3s, without transcoding or renaming.
Act numbering follows `DATA.ACTS`. Its Act IV `camp` points to a combat dungeon;
The Breach is an Act V town. Cinderwatch and The Ashen Fields retain synthesized
ambience; later optional areas and the Underground Market use the three cavern
tracks. Boss music overrides even dedicated first-area music, stays active while
any boss remains engaged, and restores the selected zone track after combat.
Player death stops music until revival or return to the title screen.

Recordings loop, share playback position across zones with the same key, and
fade briefly when the key changes. Master and Music control their volume.
UI sounds live separately in `assets/sound-effects/`.
