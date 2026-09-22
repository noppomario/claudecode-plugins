import type { On } from 'claude-code'

import { register as svg } from './draw-svg.ts'
import { register as text } from './draw-text.ts'
import { register as guidance } from './guidance.ts'

// NOPPOMARIO_MOD_DRAWS says the session has a surface that draws, so the
// MessageDisplay fallback stands down. An environment variable because that
// fallback is a separate process the engine starts, and `$.env.set` reaches
// everything started after it. Spelled out at each call: the engine refuses a
// name it cannot read off the source, so that it can list what a module
// touches. hooks/message-display.mjs reads the same name.

/**
 * Registers the mermaid feature.
 *
 * Three ways in, one at a time. A terminal draws text through `ui.render`; a
 * surface with `Svg` draws vector graphics the same way; a session that draws
 * nowhere — the VS Code panel today, `-p`, the SDK — is served by the
 * MessageDisplay hook, which reads that variable and keeps out of the way
 * wherever one of the others is drawing.
 *
 * @param on the engine's registrar
 */
export function register(on: On) {
	on('session.start', ($, e, next) => {
		// A failure here leaves the fallback drawing, which is the safe way to
		// be wrong: something is drawn either way.
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
