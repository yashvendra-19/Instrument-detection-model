# Dropzone

Dropzone takes one audio file. Five concentric rings and a radar sweep: the rings follow the pointer on springs (outer rings travel further), the sweep speeds up while a file hovers, and the rings ripple out in volt when one lands.

- Consumer provides: a container and `onFile(file)`. `Taal.Dropzone(el, {onFile, title, hint})` returns `{ripple, setTitle}`.
- Accepts `audio/*`; the consumer validates the type and says what went wrong in words.
- The title is set in `display` with one `accent` italic word in `volt-ink`; the hint lists formats in mono.
