# Instrument Intelligence Console — Design System v2

A futuristic, glass-morphism system for a multi-page React front end over the FastAPI + CLAP detector.
Visual references: Aceternity UI (aurora background, 3D card, spotlight, tracing beam, floating navbar),
React Bits (split text, shiny text, orb / particle visuals) and 21st.dev hero and bento patterns.
All components here are written from scratch for this project; no library code is copied.

## 1. Principles

1. **Depth, not decoration.** Glass panels float over a solid deep-indigo background; 3D is used to show structure
   (the sound sphere, the layered architecture, tilting cards), not as noise.
2. **Honest data.** Real results, demo results and illustrative examples are always labelled as such.
3. **Motion explains.** Motion reveals order (pipeline steps, page transitions) and responds to input
   (cursor, audio level). It is reduced to fades when the user prefers reduced motion.
4. **Tokens only.** Components use the variables in `src/styles/tokens.css`; no hard-coded hex values.

## 2. Tokens

| Group | Tokens | Notes |
|---|---|---|
| Surfaces | `--bg-0` (solid deep indigo #0b0d24), `--bg-1`, `--glass-1..3`, `--glass-border(-strong)`, `--glass-highlight` | Glass = translucent white fill, bright top edge and `backdrop-filter: blur(28px)` over a solid background |
| Text | `--text-1` (primary), `--text-2` (secondary), `--text-3` (muted) | Contrast ≥ 4.5:1 for `--text-1/2` on `--bg-0` |
| Accents | `--cyan`, `--violet`, `--magenta`, `--saffron` (+ `-rgb` triplets) | Saffron is the Indian-music accent |
| Semantic | `--success`, `--warning`, `--danger`, `--info` | Status pills, pipeline states |
| Categories | `--cat-western`, `--cat-indian-strings`, `--cat-indian-wind`, `--cat-indian-perc`, `--cat-electronic`, `--cat-brass`, `--cat-modern-strings` | One colour per instrument group |
| Gradients | `--grad-aurora`, `--grad-warm`, `--grad-glass` | Gradient text, primary buttons, glass fill |
| Type | `--font-display` (Dancing Script), `--font-sans` (Sora), `--font-mono` (JetBrains Mono), `--fs-xs..3xl`, `--fw-*`, `--lh-*` | Dancing Script for h1–h3 and the logo; Sora for body and UI; mono for numbers, prompts and code |
| Spacing | `--sp-1..9` (4-pt scale), `--page-max`, `--page-gutter` | |
| Radius | `--r-sm 10`, `--r-md 16`, `--r-lg 24`, `--r-xl 32`, `--r-pill` | |
| Elevation | `--shadow-1`, `--shadow-2`, `--glow-cyan`, `--glow-violet` | |
| Motion | `--dur-fast 160ms`, `--dur-base 320ms`, `--dur-slow 640ms`, `--ease-out`, `--ease-in-out` | |

### Font choice
**Dancing Script** (google/fonts, `ofl/dancingscript`) — a lively cursive used for headings, page titles,
card titles and the logo; it is variable (400–700), so titles use the bold 700 cut for legibility.
**Sora** (`ofl/sora`) — a geometric sans for body text, buttons and labels, where a script face would hurt readability.
**JetBrains Mono** (`ofl/jetbrainsmono`) carries scores, timestamps, prompts and code.
Both are self-hosted through `@fontsource`, so the app works offline.

## 3. Components

| Component | File | Variants / props | States | Reference idea |
|---|---|---|---|---|
| `AuroraBackground` | `components/AuroraBackground.jsx` | — | static | Solid `--bg-0` backdrop shared by every page |
| `SoundSphere` | `components/SoundSphere.jsx` | `size`, `levelRef` (live audio level), `interactive` | idle drift, cursor parallax, audio-reactive | React Bits Orb / particle sphere |
| `NavBar` | `components/NavBar.jsx` | — | active link (shared-layout pill), status pill | Aceternity floating navbar |
| `GlassCard` | `components/GlassCard.jsx` | `tilt`, `spotlight`, `glow`, `as` | hover spotlight, 3D tilt, glow border | Aceternity 3D card + card spotlight |
| `Button` | `components/Button.jsx` | `primary` / `glass` / `ghost`; `sm` / `md` / `lg`; `to` (link) | hover, active, disabled, loading | 21st.dev glow buttons |
| `SplitText` | `components/SplitText.jsx` | `text`, `delay`, `gradientWords` | word-by-word reveal | React Bits Split Text |
| `ShinyText` | `components/ShinyText.jsx` | `children` | sweeping highlight | React Bits Shiny Text |
| `Marquee` | `components/Marquee.jsx` | `items`, `reverse`, `speed` | pauses on hover | Aceternity infinite moving cards |
| `StatusPill` | in `NavBar.jsx` | online / demo / offline / busy | pulsing dot | — |
| `ConnectModal` | `components/ConnectModal.jsx` | — | idle, testing, success, error | — |
| `Waveform` | `components/Waveform.jsx` | `peaks`, `windows`, `hits`, `progress`, `onSeek` | hover scrub, playhead | — |
| `Pipeline` | `components/Pipeline.jsx` | `steps`, `stepState[]` | waiting / active / done / failed | Animated beam |
| `ResultCard` | `components/ResultCard.jsx` | `item`, `color`, `live`, `demo` | live (playing window) | Card spotlight |
| `SongTimeline` | `components/SongTimeline.jsx` | `results`, `span`, `progress` | live row, seek | — |
| `TracingBeam` | `components/TracingBeam.jsx` | `children` | scroll-linked beam | Aceternity Tracing Beam |

### Glass recipe
```css
background: var(--grad-glass);
border: 1px solid var(--glass-border);
backdrop-filter: blur(var(--blur-glass)) saturate(140%);
box-shadow: inset 0 1px 0 var(--glass-highlight), var(--shadow-2);
border-radius: var(--r-lg);
```

### Accessibility
- All interactive elements are real `<button>` / `<a>` elements with visible focus rings (`:focus-visible`, cyan).
- The 3D canvas is `aria-hidden`; every fact it shows is also in text.
- `prefers-reduced-motion: reduce` turns off tilt, marquee, aurora drift and sphere wobble.
- Status changes (connection, analysis) are announced through `role="status"` regions.

## 4. Pages (information architecture)

| Route | Page | Purpose |
|---|---|---|
| `#/` | Home | 3D hero, instrument marquee, feature bento, pipeline teaser |
| `#/analyze` | Studio | Upload / demo song, waveform + player, pipeline, results, full-song timeline, JSON export |
| `#/instruments` | Library | All 32 prompts by category, filter and search |
| `#/how-it-works` | Pipeline | Scroll-traced method, scoring formulas, 3D layered architecture, limitations |
| `#/about` | Team | Team, supervisor, stack, repository |

Shared state (API connection, demo mode, current song, results, audio element) lives in
`context/AppState.jsx`, so playback and results survive navigation between pages.
Hash routing is used so the built app works from any static file server.
