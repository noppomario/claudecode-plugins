#!/usr/bin/env node
// Draws the mermaid fences of a reply where the engine draws nothing itself.
//
// The VS Code extension runs the agent as a stream-json client, and so do
// `claude -p` and the SDK: the engine has no surface, `ui.render` is never
// raised, and the only way to change what is shown is MessageDisplay, which
// replaces the displayed text without touching the transcript or what the
// model reads.
//
// It draws with `useAscii`, not box-drawing characters. A webview takes its
// font's word for a character's width, and in a CJK monospace font the box
// characters are two cells wide while the renderer counts them as one.
//
// It stands down wherever a surface is drawing: the hooks module sets the
// variable below on `session.start` and `session.attach`, and the engine
// starts this process after that.

import { withDrawings } from './features/mermaid/render.mjs'

/**
 * No width to respect. A terminal wraps a drawing that is too wide and ruins
 * it, so the terminal hook holds one to the viewport; the surfaces this hook
 * serves put a code block in a box that scrolls sideways, where a wide
 * diagram is a wide diagram and nothing breaks.
 */
const SCROLLS = Number.POSITIVE_INFINITY

const DRAWS = 'NOPPOMARIO_MOD_DRAWS'

if (process.env[DRAWS] === '1') process.exit(0)

let input = ''
for await (const chunk of process.stdin) input += chunk

let delta
try {
	delta = JSON.parse(input).delta
} catch {
	process.exit(0)
}

if (typeof delta !== 'string' || delta === '') process.exit(0)

// The event hands over the lines newly ready to draw, not the whole message,
// so a fence still streaming has no closing ticks yet and is left alone.
const text = withDrawings(delta, { columns: SCROLLS, useAscii: true })

if (text !== delta) {
	process.stdout.write(
		`${JSON.stringify({
			hookSpecificOutput: { hookEventName: 'MessageDisplay', displayContent: text },
		})}\n`,
	)
}
