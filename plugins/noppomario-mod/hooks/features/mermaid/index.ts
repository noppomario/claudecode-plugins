import type { On } from 'claude-code'

import { register as drawing } from './draw.ts'
import { register as guidance } from './guidance.ts'

/**
 * Registers the mermaid feature: the model is asked to write fences, and the
 * fences it writes are drawn.
 *
 * Both halves are bound to the terminal, which is where the drawing happens,
 * so `session.start` records the surface once and the two hooks read it.
 *
 * @param on the engine's registrar
 */
export function register(on: On) {
	let isTerminal = false

	on('session.start', ($, e, next) => {
		isTerminal = e.surface === 'terminal'
		return next(e)
	})

	guidance(on, () => isTerminal)
	drawing(on)
}
