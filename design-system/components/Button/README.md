# Button

Button is the one action control: primary (volt fill, on-volt text) for the single main action on a screen, quiet for secondary actions, ghost for toolbar toggles.

- Consumer provides: a `<button>` or `<a>` element and its label. Call `Taal.Button(el, {variant, label, arrow})` or add the classes `t-btn t-btn--primary|quiet|ghost` and call `Taal.motion.magnetic(el)`.
- Motion: the button follows the pointer on a `SPRING.snappy` spring and returns on `SPRING.bouncy`; an ink flood grows from the pointer position on hover; press dips to .96. While its request runs add `is-busy`: a volt glow and a scan line.
- One primary per view. Labels are verbs in mono uppercase: "Analyze audio", "Test connection".
- Disabled is .45 opacity; never hide the reason, put it in helper text beside the button.
