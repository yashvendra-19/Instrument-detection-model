# TaalRing

TaalRing is the temporal map: the whole song as one rhythm cycle. Ticks on the rim are the 10-second windows, X marks sam. Each detected instrument gets a lane; its arc is its peak window. A hand sweeps the cycle and each arc swells as the hand crosses it.

- Consumer provides: `{results, duration, period}`. Returns `{destroy}`; call it before rebuilding.
- Hovering an arc shows the instrument and window in the centre.
- `setTime(seconds)` hands the sweep to playback; it resumes free-running 0.6 s after updates stop.
- Lanes draw in with `--dur-draw`, arcs follow staggered by 110ms.
