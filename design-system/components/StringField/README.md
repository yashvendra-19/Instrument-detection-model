# StringField

StringField is the hero instrument: seven strings, one per instrument family, strung across the page. Moving the pointer across a string plucks it where it was crossed, harder for faster strokes; tapping plucks the nearest one. Strings pluck in sequence on load and breathe with an occasional soft pluck while idle. `drive(bands)` connects it to a Player: onsets in each of seven frequency bands pluck that band's string, and band energy thickens the string and fills a bar behind it.

- Consumer provides: a sized container. Options `{labels, idle, intro, inset}`; returns `{pluck(i, position, amplitude), drive(bands)}`.
- Physics: modal superposition of seven harmonics of a triangular pluck, each damped faster than the last. Lower strings draw thicker.
- Respects reduced motion: strings stay still and plucks are ignored.
