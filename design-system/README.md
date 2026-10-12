Taal is the visual language for the Indian instrument detection service: a FastAPI + CLAP backend that slices a song into 10-second windows, matches each one against 32 instrument descriptions, and returns the instruments that stand out. The system treats those windows as beats of a rhythm cycle (taal), every detected instrument as a string, and every screen as an instrument panel: graphite surfaces, one electric signal colour, and data that moves.

## Principles

- **The song is a cycle.** Time is always shown in 10-second windows, the classifier's real unit, labelled W01, W02… The first window is sam, marked X.
- **Motion is measurement.** Strings vibrate in proportion to score, the playhead is the real playback time, the pipeline bead moves only while a real request is in flight, and stage timings are measured. Nothing moves for decoration alone.
- **One live colour.** `volt` means "this is live or primary": the main button, the playhead, the active stage, the scroll bow, API online. Everything else is graphite and ink, plus the seven family hues used as data.
- **Honest numbers.** Scores are cosine similarity, not probability. Say so near every score. Simulated playback says it is simulated.

## Voice and copy

- Plain, precise and calm, like good developer tooling. Name what the person sees: "Drop a song", "Analyze audio", "Connect the API".
- Second person, active voice, no exclamation marks, no emoji.
- Use the backend's real terms: "10-second windows", "48 kHz mono", "dynamic threshold", "cosine similarity". Use Indian music terms only where they mean something on screen: sam (X), taal, raag Yaman for pluck pitches.
- Errors lead with FAILED in `alarm` mono, then say what to do: "401 Unauthorized: check the username and password."
- Sample and simulated data are always labelled: "README sample response · not a real analysis", "Simulated playback of the example signal · silent".
- Instrument names are exactly what `PROMPT_TO_INSTRUMENT` returns: "Duff or khanjari", "808 Bass".

## Colour

- Two themes, **Dark** first and **Light**. Design in Dark.
- Graphite surfaces step up: `ground` → `surface` → `surface-raised`; `well` is recessed (tracks, inputs, ring lanes). A 24px dot grid in `line` sits on `ground` only.
- Text is `ink` or `ink-muted` on any surface (6:1 or better in both themes).
- `volt` (#c6f432) is the brand and live signal. Fills carry `on-volt` text. As text or a thin mark use `volt-ink` (the same lime in Dark, a deep olive in Light, because lime fails on white). `glow-volt` is for live elements only.
- `alarm` is failure only and always sits beside a word. Online is `volt-ink` with the word "online"; state never relies on hue.
- `focus` is a 2px solid ring with 2px offset on every interactive element.
- **Family hues** (`fam-*`) are a categorical palette in fixed slot order: western, Indian strings, Indian wind, Indian percussion, electronic, brass, modern strings. They were run through the data-viz palette validator for both themes: every value sits in the lightness band, above the chroma floor, 3:1 or more against the surface, with adjacent colour-vision-deficiency separation of ΔE 13.7 (Dark) and 11.4 (Light) and normal-vision separation of 16.5 or more. Use them only for marks (strings, ring arcs, meter bars, matrix squares) and always next to the family or instrument name. Text stays in ink. Never cycle them by rank: a family keeps its colour whatever else is on screen.
- `volt` and `alarm` are reserved and never used for a family.
- No gradients for decoration; the only gradients are the radar sweep and the button scan line, both built from `well`.

## Type

- `display` and `sans` are Geist: display at 600 with tight tracking (-0.045 to -0.055em), body at 400.
- `accent` is Instrument Serif italic for exactly one word per headline, in `volt-ink`. It is the one human note in an otherwise technical page.
- `mono` is Geist Mono for every number, timestamp, label and status. Labels are uppercase with .08em tracking. Scores use `numeral` (300, tabular figures).
- Scale: `display-xl` 104 → `display-l` 64 → `title` 28 → `heading` 16 → `body` 15 → `body-s` 13; `numeral` 44, `data` 12, `label` 11.

## Space, shape and depth

- Spacing `space-1` to `space-9` (4 → 120px). Panels pad `space-6`; sections sit `space-9` apart on desktop, `space-8` on phones; side gutter `space-4` on phones.
- Radii are small and technical: `radius-xs` 2px for ticks and family squares, `radius-sm` 6px for chips and inputs, `radius-md` 10px for buttons and tiles, `radius-lg` 16px for panels and the dropzone. Status pills and the play button are fully round.
- Depth comes from surface steps and `line` borders. `shadow-lift` is for the drawer; `shadow-press` for pressed controls; `glow-volt` for live elements.
- The top bar is translucent `ground` with a 14px backdrop blur so the dot grid and content pass under it.

## Motion

Motion runs on [Motion](https://motion.dev) 11.11.17 (`components/lib/motion.js`, global `Motion`) through `Taal.motion`, with a Web Animations fallback when it is absent. Springs, not durations, drive anything a person touches.

| Spring | Stiffness / damping | Use |
| --- | --- | --- |
| `SPRING.snappy` | 520 / 34 | Pointer-following (magnetic buttons), drawer entry |
| `SPRING.soft` | 170 / 22 | Entrances: headline words, rows, notes, file name |
| `SPRING.bouncy` | 380 / 15 | Returns and pops: button release, pipeline bead, status dot, matrix hits |
| `SPRING.gentle` | 110 / 20 | Counting numbers, pipeline progress line |

| Timed curve | Value | Use |
| --- | --- | --- |
| `--ease-out` | cubic-bezier(.16,1,.3,1) | Colour and border changes, label decode |
| `--ease-in-out` | cubic-bezier(.65,0,.35,1) | String drawing, ring lanes, drawer exit |
| `--dur-hover` / `--dur-enter` / `--dur-draw` | 200 / 420 / 1400ms | Hover, enter, long draws |

- **One orchestrated entrance per view.** Hero: headline words rise on staggered springs (60ms), the kicker decodes, the strings pluck in sequence. Sections: on entering view, the title rises, labels and the section number decode, the note slides in.
- **Scroll-linked.** The volt bow at the top tracks page progress; the hero strings drift down and fade as the hero scrolls away.
- **Audio-reactive.** `Taal.Player` measures seven frequency bands from the loaded file with a Web Audio analyser (or simulates them, silently and labelled, for the example). Band onsets pluck the matching family string, band energy thickens it, the meter bars follow, the waveform playhead and played bars follow time, result strings light and pluck when the playhead enters their peak window, and the ring hand follows playback.
- **Physics for strings.** Seven damped harmonics of a triangular pluck (`StringField`, `InstrumentString`); no keyframes.
- **Decode** (`scramble`) is for mono text that changes: labels on entry, status text, stage names as they start.
- **Resting state is guaranteed.** Every entrance completes itself shortly after its scheduled end even if frames stall (background tab, thumbnail capture), so the page always reads correctly at rest.
- `prefers-reduced-motion`: springs and tweens jump to their end state, strings stay still, scroll-linking is off, the ring hand stops.
- Sound is off by default and starts only from the Sound button: Karplus-Strong plucks tuned to raag Yaman from Sa = D3.

## Iconography

No icon set. Typographic glyphs only: → on forward actions, X for sam, W01… for windows, and the two transport glyphs (play, pause) drawn as 16px SVG paths in `currentColor`. The recurring mark is the 8px family square (`radius-xs`, `fam-*`). There is no logo in the repository; the wordmark is "Taal" in Geist 700 with a volt square after it.

## Components

- **Actions:** Button.
- **Input:** Dropzone (radar rings), Field.
- **Signal:** StringField (hero), Transport + Player, Waveform (window ruler, playhead, readout), Stages (seven backend stages).
- **Results:** InstrumentString, TaalRing, MetricTile, FamilyChip.
- **Status:** StatusPill.

Each is a factory on `window.Taal` taking a host element and props; see `components/index.d.ts`. Load `components/lib/motion.js` before `components/bundle.js`. `Taal.api.health()` and `Taal.api.detect()` call `GET /` and `POST /detect` with Basic Auth; credentials are passed per call and never stored.

## Lineage

What came from the v1 console in `frontend/styles.css`, and what replaced it.

| v1 | Value | Taal |
| --- | --- | --- |
| `--bg` | #03050b | `ground` #07090d with a 24px dot grid (v1 had a 46px line grid) |
| `--text` / `--muted` | #f5f8ff / #8d9ab3 | `ink` #e8edf5 / `ink-muted` #93a0b4 |
| `--line` | rgba(142,170,214,.13) | `line`, plus `line-strong` (3:1) for controls |
| `--cyan` as primary | #00e5ff | `volt` #c6f432 as the single live colour |
| cyan→blue→purple→magenta gradients | | retired; flat family hues as data only |
| `palette[]` in app.js, 8 accents cycled by result index | | 7 validated `fam-*` hues, fixed by family |
| `--green` / `--red` | #45ffbd / #ff3158 | `volt-ink` (online) / `alarm`, always with a word |
| Inter + Space Grotesk | | Geist + Geist Mono, Instrument Serif italic as accent |
| Panel radius 20px, cards 11–13px | | `radius-lg` 16px, `radius-md` 10px |
| Motion 13.4.0 `animate` with ease-out, CSS keyframe loops | | Motion 11.11.17 springs, scroll-linked, in-view; physics strings; audio-reactive playback |
| 5 pipeline steps on a timer | | 7 stages tied to the real request, with measured timings |
| Orbit monitor, cursor glow, noise | decoration | StringField, Transport and TaalRing, which carry data |
