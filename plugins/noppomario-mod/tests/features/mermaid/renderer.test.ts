import { describe, expect, test, tier } from 'claude-code/testing'

import { renderMermaid } from '../../../hooks/features/mermaid/renderer.mjs'

tier('user')

/**
 * East Asian Wide and Fullwidth, the characters a terminal cell pair holds.
 * Halfwidth katakana (U+FF61-FF9F) is deliberately outside it: it is narrow.
 */
const WIDE =
	/[ᄀ-ᅟ〈〉⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏ꥠ-꥿가-힣豈-﫿︐-︙︰-﹯＀-｠￠-￦]/

const width = (line: string) => [...line].reduce((n, c) => n + (WIDE.test(c) ? 2 : 1), 0)

/** A left-to-right chain draws as three rows: top border, labels, bottom. */
const chain = (label: string) => `graph LR\n  A[${label}] --> B[${label}]`

/**
 * These guard the extraction, not the plugin: `scripts/extract-renderer.mjs`
 * carves the renderer out of the Claude Code binary by reading its export
 * table, and a Claude Code update can move what it slices. Checking that a
 * diagram draws is not enough — a renderer that draws crooked boxes is worse
 * than one that does not draw, since crooked boxes are the whole complaint.
 */
describe('renderer', () => {
	for (const [name, label] of [
		['ascii', 'Start'],
		['japanese', '開始'],
		['mixed', 'API受信'],
		['punctuation', '判定：OK？'],
		['halfwidth katakana', 'ｶｲｼ'],
		['ambiguous width', 'α→β'],
	] as const) {
		test(`a ${name} label draws a rectangle`, async () => {
			const drawn = renderMermaid(chain(label), 120, () => {})

			expect(drawn?.kind).toBe('flowchart')
			expect(drawn?.lines.length).toBe(3)
			expect(new Set(drawn?.lines.map(width)).size).toBe(1)
		})
	}

	test('a sequence diagram draws', async () => {
		const source = 'sequenceDiagram\n  participant U as 利用者\n  U->>U: 要求'

		expect(renderMermaid(source, 120, () => {})?.kind).toBe('sequence diagram')
	})

	test('a label it cannot measure is refused rather than drawn crooked', async () => {
		// `か` and a combining voiced mark, whose width the renderer will not guess.
		expect(renderMermaid(chain('が'), 120, () => {})).toBeUndefined()
	})

	test('a diagram wider than the terminal is refused', async () => {
		expect(renderMermaid(chain('あ'.repeat(40)), 40, () => {})).toBeUndefined()
	})
})
