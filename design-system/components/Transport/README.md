# Transport

Transport plays the loaded signal: a round play button, a time readout and a seven-bar meter, one bar per family string in its `fam-*` colour.

- Consumer provides: `{duration, note, onToggle}`; returns `{setPlaying(bool), update(t, duration, bands), setNote(text)}`.
- Pair with `Taal.Player`: `new Taal.Player({file})` analyses a real file with a Web Audio analyser in the browser; `new Taal.Player({duration, samples})` runs a silent simulation for the example signal. Always say which in the note.
- The play button is magnetic and pops on a bouncy spring when it changes state.
