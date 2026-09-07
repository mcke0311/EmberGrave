# Sound effects

`Dark Fantasy Game Mouse Click Sound.mp3` is the default UI activation sound.
The supplied file is preserved without renaming or transcoding.

`js/audio.js` centralizes its definition in `Sfx.EFFECTS`, fetches it once and
decodes a reusable Web Audio buffer. Each activation plays a fresh one-shot
through the Sound Effects and Master volume controls. Music volume has no effect
on it. Rapid input has at most four simultaneous tails; loading or resuming audio
never queues a burst of old clicks.

`UI.init()` delegates feedback for buttons, inventory/equipment, dialogue,
waypoints, settings changes and supported right-click actions. Keyboard button
activation uses the same click event. Disabled controls and typing stay silent.

`Player Dies In Dark Fantasy Game. Yelling Sound.mp3` is the player death sound.
The original file is preserved. `Sfx.EFFECTS.death` preloads and decodes it once;
each player death plays a one-shot through Sound Effects and Master volume.
Music volume does not affect it. Repeated death notifications for an already
dead hero do not replay it, and a later death replaces an unfinished voice tail.
The death voice has its own 0.4 gain (about −8 dB), a 25 ms entrance fade, and a
120 ms natural ending fade. Respawning or leaving the game fades it out over
80 ms, so the 6.7-second recording cannot continue over the returned hero.
Fatal hits skip the synthetic hurt buzz. Companions still collapse when their
owner dies, but their simultaneous bone/flesh sounds are suppressed in that case.
Ordinary nonfatal hits and independent companion deaths retain their feedback.
Enemies cannot acquire a dead player as a target. This prevents their alert
voices from retriggering every frame during the death/respawn delay and stacking
into a continuous buzz over the recording.

Background music stops as soon as the player dies. In normal mode, the death
screen waits for **Back to Town**; there is no automatic respawn timer. Town music
starts after that button's map transition succeeds. Music remains stopped while
waiting or retrying a failed town load.

Skill combat now uses the recorded layers under `skills/`, with 108 explicit
assignments (107 skills plus basic attacks), bounded playback and live effect
lifetimes. See `skills/CREDITS.md` for CC0 source attribution and
`../../docs/SKILL_AUDIO.md` for the runtime and isolated audition studio.
