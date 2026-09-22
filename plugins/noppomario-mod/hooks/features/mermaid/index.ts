import type { On } from 'claude-code'

import { register as svg } from './draw-svg.ts'
import { register as text } from './draw-text.ts'
import { register as guidance } from './guidance.ts'

/**
 * Registers the mermaid feature: three ways in, one drawing at a time.
 *
 * A terminal and a surface with `Svg` draw through `ui.render`. A session
 * that draws nowhere — the VS Code panel today, `-p`, the SDK — is served by
 * the MessageDisplay hook, which stands down when NOPPOMARIO_MOD_DRAWS says
 * one of the others has it. An environment variable, because that hook is a
 * separate process, and spelled out at each call because the engine refuses
 * a name it cannot read off the source.
 *
 * @param on the engine's registrar
 */
export function register(on: On) {
	on('session.start', ($, e, next) => {
		// Failing here leaves the fallback drawing, which is the safe way to be
		// wrong.
		if (e.surface !== null) void $.env.set('NOPPOMARIO_MOD_DRAWS', '1').catch(() => {})
		return next(e)
	})

	on('session.attach', ($, e, next) => {
		void $.env.set('NOPPOMARIO_MOD_DRAWS', '1').catch(() => {})
		return next(e)
	})

	guidance(on)
	text(on)
	svg(on)
}
