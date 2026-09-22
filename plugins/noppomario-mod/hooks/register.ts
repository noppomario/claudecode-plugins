import type { On } from 'claude-code'

import { register as mermaid } from './features/mermaid/index.ts'

/**
 * A plugin may name one hooks module, so the features live under `features/`
 * and this composes them. Adding one is a folder and a line here.
 *
 * @param on the engine's registrar
 */
export function register(on: On) {
	mermaid(on)
}
