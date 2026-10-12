# Stages

Stages draws the seven backend stages from `classifier.py` on one line. A volt bead jumps from stage to stage on a bouncy spring, the line fills behind it on a gentle spring, each stage name decodes as it starts, and each stage stamps its elapsed seconds.

- Consumer provides: a container; optional `stages` as `[name, detail]` pairs.
- `run(promise)` steps through the stages, holds on the last until the promise settles, then resolves with its value or rejects with its error. The animation never invents results.
- Stacks vertically under 760px.
