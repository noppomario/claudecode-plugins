#!/usr/bin/env node
// Draws the mermaid fences of a reply where the engine draws nothing itself.
//
// The VS Code extension runs the agent as a stream-json client, and so do
// `claude -p` and the SDK: the engine has no surface, `ui.render` is never
// raised, and the only way to change what is shown is MessageDisplay, which
// replaces the displayed text without touching the transcript or what the
// model reads.
//
// It draws in ASCII, where the terminal hook draws with box-drawing
// characters, and the difference is not taste.
//
// A terminal is a grid: it places every character by cell, so a glyph wider
// than its cell is clipped and its neighbours stay put. VS Code's terminal
// goes further and draws U+2500-U+257F itself, from `customGlyphs`, so the
// lines never come from the font at all.
//
// A webview has neither. It lays text out by advance width, and box-drawing
// characters are East Asian Ambiguous: a CJK monospace font gives them two
// columns where the renderer counted on one, and every row after shifts. The
// only way to draw lines here is to name a font that has narrow glyphs for
// them in `editor.fontFamily` -- which is a plugin asking to be configured
// before it works. ASCII is one column in every monospace font.
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
