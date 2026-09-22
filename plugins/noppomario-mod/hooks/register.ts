import type { On } from 'claude-code'

import { register as mermaid } from './features/mermaid/index.ts'

/**
 * Registers every feature this plugin carries.
 *
 * A plugin may name one hooks module, so the features live under `features/`
 * and this file composes them. Adding one is a folder and a line here.
 *
 * @param on the engine's registrar
 */
export function register(on: On) {
	mermaid(on)
}
