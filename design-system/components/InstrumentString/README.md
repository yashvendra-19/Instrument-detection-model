# InstrumentString

InstrumentString is one detected instrument drawn as a string. Ticks mark every 10-second window across the song; the tinted band and the fret dot sit on the instrument's peak window. The string draws in, then plucks; hover plucks it gently, click or Enter plucks it fully (with a Karplus-Strong note in raag Yaman when sound is on). During playback a volt line tracks the playhead; when it enters the peak window the row lights and the string plucks itself.

- Consumer provides: `{item, index, duration, maxPct, delay}`, where `item` is one entry of the `/detect` response. Wire `setTime(seconds)` to a Player.
- Pluck amplitude scales with confidence relative to the top match, so the strongest instrument rings widest.
- The score is a ticker in `numeral`; the raw cosine value and timestamp sit under it in `data`.
