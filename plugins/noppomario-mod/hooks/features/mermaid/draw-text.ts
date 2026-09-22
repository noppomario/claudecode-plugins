import type { On } from 'claude-code'

import { DEFAULT_COLUMNS, HAS_FENCE, withDrawings } from './render.mjs'

/** What one session keeps of what it has already drawn. */
const MAX_ENTRIES = 32
const MAX_CHARS = 250_000
const MAX_ENTRY_CHARS = 50_000

/**
 * Remembers one drawing, oldest dropped first.
 *
 * A message is re-rendered on every frame and on every change of width, and
 * laying a diagram out again for a drawing that has not changed is the one
 * cost worth avoiding here.
 *
 * @param drawn the cache
 * @param key the message's text and the width it was drawn at
 * @param text the drawing
 */
function remember(drawn: Map<string, string>, key: string, text: string) {
	drawn.delete(key)
	if (key.length + text.length > MAX_ENTRY_CHARS) return

	drawn.set(key, text)

	let chars = 0
	for (const [k, v] of drawn) chars += k.length + v.length
	for (const [k, v] of drawn) {
		if (drawn.size <= MAX_ENTRIES && chars <= MAX_CHARS) return
		drawn.delete(k)
		chars -= k.length + v.length
	}
}

/**
 * Draws the mermaid fences of a reply as text, where they stand.
 *
 * The terminal is the only surface that takes this: the others carry `Svg`
 * and are served by `draw-svg`. A fence that does not parse or does not fit
 * the width keeps its source.
 *
 * It draws with box-drawing characters. They are East Asian Ambiguous, so
 * whether one is a column or two is the font's to decide and the terminal's
 * to guess, and a terminal whose font draws them wide takes the drawing
 * apart. That is a font to name once (Adwaita Mono has narrow glyphs for all
 * of them) in exchange for lines instead of `+-|`; `useAscii: true` below
 * needs no such agreement and gives `<--->` where a diamond would be.
 *
 * @param on the engine's registrar
 */
export function register(on: On) {
	const drawn = new Map<string, string>()

	on(
		'ui.render',
		{ component: 'AssistantMessage', surface: 'terminal', props: { text: HAS_FENCE } },
		($, e, next) => {
			const columns = e.viewport?.columns ?? DEFAULT_COLUMNS
			const key = `${columns}\n${e.props.text}`
			const text =
				drawn.get(key) ?? withDrawings(e.props.text, { columns, useAscii: false })

			remember(drawn, key, text)

			if (text === e.props.text) return next(e)
			return next({ ...e, props: { ...e.props, text } })
		},
	)
}
