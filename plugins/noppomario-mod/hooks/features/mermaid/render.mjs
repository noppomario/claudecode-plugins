// .mjs so both sides can import it: the hooks module, which the engine loads
// as TypeScript, and hooks/message-display.mjs, which runs as a Node process.

import { renderMermaidASCII } from './vendor/zombie-text.mjs'

/** A closed mermaid fence: indent, ticks, source. */
export const FENCE = /^([ \t]{0,3})(`{3,}|~{3,})[ \t]*mermaid[^\n]*\n([\s\S]*?)\n[ \t]*\2[ \t]*$/gm

export const HAS_FENCE = /^[ \t]{0,3}(?:`{3,}|~{3,})[ \t]*mermaid[ \t\r]*$/im

export const DEFAULT_COLUMNS = 80

// The renderer leaves five rows between ranks. Three is the least that still
// puts an edge's label below its box rather than on the border. Box padding
// is left alone: dropping it saves two rows per box but lets edges route
// through labels, and `Fai|ed` is what this feature exists to prevent.
const LAYOUT = { paddingY: 3 }

/** A node's shape and label: `[]`, `()`, `([])`, `(())`, `[[]]`, `{}`. */
const LABEL = /(?<=[\p{L}\p{N}_])(\[\[|\(\(|\(\[|\{|\[|\()([^\]})\n"|]+)(\]\]|\)\)|\]\)|\}|\]|\))/gu

// Widens a label's margin from one column to two, which a wide script needs:
// its characters are two columns each. Done to the source, so the renderer
// measures the padding itself; inserting it into the drawing would move one
// line and leave the rest. Edge labels get none — the renderer trims them.
const padded = (source) => source.replace(LABEL, '$1  $2  $3')

// `useAscii` leaves U+2016 in a state diagram's end marker. It is East Asian
// Ambiguous, so a CJK font draws it two columns wide and shifts its row.
// One character for one, so nothing moves.
const asciiOnly = (drawn) => drawn.replace(/‖/gu, '|')

/** East Asian Wide and Fullwidth; halfwidth katakana is narrow, so excluded. */
const WIDE =
	/[ᄀ-ᅟ〈〉⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏ꥠ-꥿가-힣豈-﫿︐-︙︰-﹯＀-｠￠-￦]/

export const displayWidth = (line) =>
	[...line].reduce((columns, ch) => columns + (WIDE.test(ch) ? 2 : 1), 0)

/**
 * Draws one diagram as text, or answers null to keep the source: it did not
 * parse, or it is wider than the room, where wrapping would break it.
 *
 * @param {string} source the diagram, without its fence
 * @param {{ columns: number, useAscii: boolean }} options
 * @returns {string | null}
 */
export function drawing(source, { columns, useAscii }) {
	let text
	try {
		text = String(renderMermaidASCII(padded(source), { colorMode: 'none', ...LAYOUT, useAscii }))
	} catch {
		return null
	}

	const lines = (useAscii ? asciiOnly(text) : text)
		.split('\n')
		.map((line) => line.replace(/[ \t]+$/, ''))
	while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()

	if (lines.length === 0) return null
	if (lines.some((line) => displayWidth(line) > columns)) return null

	return lines.join('\n')
}

/**
 * Replaces every fence with its drawing. One that does not draw keeps its
 * source, so a failure shows the diagram's text rather than nothing.
 *
 * @param {string} text the reply's markdown
 * @param {{ columns: number, useAscii: boolean }} options
 * @returns {string}
 */
export function withDrawings(text, options) {
	if (!HAS_FENCE.test(text)) return text

	return text.replace(FENCE, (fence, indent, ticks, source) => {
		const drawn = drawing(source, options)
		return drawn === null ? fence : `${indent}${ticks}\n${drawn}\n${indent}${ticks}`
	})
}
