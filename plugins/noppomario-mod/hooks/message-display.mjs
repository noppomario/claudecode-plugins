#!/usr/bin/env node
// Draws a reply's mermaid fences where the engine draws nothing itself: the
// VS Code panel, `claude -p`, the SDK. Temporary in the panel's case: when
// the extension attaches as a surface, `draw-svg.ts` takes over and this
// file goes, along with the MessageDisplay entry in hooks.json. All run the agent as a stream-json
// client, where `ui.render` is never raised and MessageDisplay is the only
// way to change what is shown -- on screen alone, never the transcript.
//
// In ASCII, where the terminal hook uses box-drawing characters. A webview
// lays text out by advance width, and box-drawing characters are East Asian
// Ambiguous: a CJK monospace font gives them two columns where the renderer
// counted on one, and every row after shifts. Drawing lines here would mean
// asking for `editor.fontFamily`, which is a plugin that does not work until
// it is configured. ASCII is one column in every monospace font.
//
// It stands down where a surface is drawing: the hooks module sets the
// variable below, and the engine starts this process after that.

import { withDrawings } from './features/mermaid/render.mjs'

// No width to respect: a code block here scrolls sideways, where a terminal
// would wrap the drawing and ruin it.
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
