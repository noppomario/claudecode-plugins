import type { On } from 'claude-code'

import { withDiagrams } from './renderer.mjs'

/** Only a message holding a closed mermaid fence is worth redrawing. */
const FENCE = /^ {0,3}(?:`{3,}|~{3,})[ \t]*mermaid[ \t\r]*$/im

/** The width to lay out into where the surface has not measured one. */
const DEFAULT_COLUMNS = 80

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
 * Registers the drawing.
 *
 * The hook is on `terminal` alone. The VS Code extension launches the agent
 * as a stream-json client, where the engine draws nowhere and `ui.render` is
 * never raised, so a hook registered there would never run; that surface is
 * served separately.
 *
 * A fence that does not parse, does not fit the width, or throws keeps its
 * source, so a failure shows the diagram's text rather than nothing.
 *
 * @param on the engine's registrar
 */
export function register(on: On) {
	const drawn = new Map<string, string>()

	on(
		'ui.render',
		{ component: 'AssistantMessage', surface: 'terminal', props: { text: FENCE } },
		($, e, next) => {
			const columns = e.viewport?.columns ?? DEFAULT_COLUMNS
			const key = `${columns}\n${e.props.text}`
			const text = drawn.get(key) ?? withDiagrams(e.props.text, columns)

			remember(drawn, key, text)

			if (text === e.props.text) return next(e)
			return next({ ...e, props: { ...e.props, text } })
		},
	)
}
