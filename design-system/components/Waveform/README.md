# Waveform

Waveform shows the uploaded signal over a window ruler: one band per 10-second window (the classifier's chunk size), alternate bands shaded `well`, the first window marked X (sam). Bars grow left to right on load. Hovering shows a crosshair readout (`W05 · 0:43`); clicking seeks.

- Consumer provides: `{samples, duration}` (use `Taal.decodePeaks(file)`), or nothing for a synthesised example.
- `setPeaks(results)` draws each instrument's peak window as a family-coloured cap along the top.
- `setTime(t)` moves the volt playhead and paints played bars in `volt-ink`.
- Consumer provides `onSeek(seconds)` to connect clicks to a Player.
