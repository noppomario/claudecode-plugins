import type { On } from 'claude-code'

import { DEFAULT_COLUMNS, HAS_FENCE, withDrawings } from './render.mjs'

const MAX_ENTRIES = 32
const MAX_CHARS = 250_000
const MAX_ENTRY_CHARS = 50_000

// A message re-renders on every frame and every change of width, so laying
// an unchanged diagram out again is the one cost worth avoiding. Oldest out.
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
 * Draws a reply's mermaid fences as text, where they stand. The terminal
 * alone: the other surfaces carry `Svg` and go through `draw-svg`.
 *
 * Box-drawing characters are safe here. A terminal places every character by
 * cell, so a glyph wider than its cell is clipped rather than allowed to move
 * its neighbours, and VS Code draws U+2500-U+257F itself rather than from the
 * font. A webview has neither protection, which is why `message-display.mjs`
 * draws the same diagrams in ASCII.
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
