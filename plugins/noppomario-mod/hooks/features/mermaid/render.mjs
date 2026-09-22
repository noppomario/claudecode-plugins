// Turning the mermaid fences of a reply into drawings.
//
// Written as .mjs so both sides can import it: the hooks module, which the
// engine loads as TypeScript, and hooks/message-display.mjs, which runs as an
// ordinary Node process where no engine exists.

import { renderMermaidASCII } from './vendor/zombie-text.mjs'

/** A closed mermaid fence and the source inside it. */
export const FENCE = /^([ \t]{0,3})(`{3,}|~{3,})[ \t]*mermaid[^\n]*\n([\s\S]*?)\n[ \t]*\2[ \t]*$/gm

/** A reply with no fence never needs rendering; this is the cheap test. */
export const HAS_FENCE = /^[ \t]{0,3}(?:`{3,}|~{3,})[ \t]*mermaid[ \t\r]*$/im

/** The width to lay out into where the surface has not measured one. */
export const DEFAULT_COLUMNS = 80

/**
 * How tightly to draw.
 *
 * A transcript is read by scrolling, so height is what a diagram costs. The
 * renderer's own spacing leaves five rows between ranks; three is the least
 * that still puts an edge's label below the box it leaves, rather than on its
 * border.
 *
 * The padding inside a box is left alone. Taking it away saves two rows per
 * box and looks like a bargain on a small diagram, but on a dense one the
 * renderer then routes an edge straight through a label — `Failed` comes out
 * as `Fai|ed`. A drawing with a line through a word is the thing this feature
 * exists to prevent, so the rows are worth their price.
 */
const LAYOUT = { paddingY: 3 }

/**
 * East Asian Wide and Fullwidth: the characters a terminal draws in two cells.
 * Halfwidth katakana (U+FF61-FF9F) is outside it deliberately — it is narrow.
 */
const WIDE =
	/[\u1100-\u115F\u2329\u232A\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA000-\uA4CF\uA960-\uA97F\uAC00-\uD7A3\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/

/**
 * @param {string} line one line of a drawing
 * @returns {number} the columns it occupies
 */
export const displayWidth = (line) =>
	[...line].reduce((columns, ch) => columns + (WIDE.test(ch) ? 2 : 1), 0)

/**
 * Draws one diagram as text.
 *
 * `useAscii` is the whole difference between the surfaces. A terminal places
 * box-drawing characters in one cell each, so `─│┌` read better there. A
 * webview takes its font's word for it, and in a CJK monospace font those
 * characters are two cells wide while the renderer counts them as one, so the
 * box comes apart: `- | +` are the only characters whose width no font
 * argues with.
 *
 * @param {string} source the diagram, without its fence
 * @param {{ columns: number, useAscii: boolean }} options
 * @returns {string | null} the drawing, or null to keep the source: it did not
 *          parse, or it does not fit the width, where wrapping would break it
 */
export function drawing(source, { columns, useAscii }) {
	let text
	try {
		text = String(renderMermaidASCII(source, { colorMode: 'none', ...LAYOUT, useAscii }))
	} catch {
		return null
	}

	const lines = text.split('\n').map((line) => line.replace(/[ \t]+$/, ''))
	while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
	if (lines.length === 0) return null
	if (lines.some((line) => displayWidth(line) > columns)) return null

	return lines.join('\n')
}

/**
 * Replaces every mermaid fence of a reply with its drawing.
 *
 * A fence that does not draw keeps its source, so a failure shows the
 * diagram's text rather than nothing.
 *
 * @param {string} text the reply's markdown
 * @param {{ columns: number, useAscii: boolean }} options
 * @returns {string} the rewritten markdown, or `text` when nothing drew
 */
export function withDrawings(text, options) {
	if (!HAS_FENCE.test(text)) return text

	return text.replace(FENCE, (fence, indent, ticks, source) => {
		const drawn = drawing(source, options)
		return drawn === null ? fence : `${indent}${ticks}\n${drawn}\n${indent}${ticks}`
	})
}

/**
 * Every mermaid source a reply holds, in the order they appear.
 *
 * @param {string} text the reply's markdown
 * @returns {string[]} the sources, without their fences
 */
export function sourcesOf(text) {
	return [...text.matchAll(FENCE)].map(([, , , source]) => source)
}
