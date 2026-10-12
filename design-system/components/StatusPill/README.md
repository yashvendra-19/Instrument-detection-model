# StatusPill

StatusPill reports the API connection: online (`volt-ink`), busy (`ink`), offline (`alarm`). The dot pings while live and pops on a spring when the state changes; the text decodes into place.

- Consumer provides: an element; `Taal.StatusPill(el, {state, text}).set(state, text)`.
- The text always says the state in words ("API online", "Request failed"), so the colour is never the only cue.
