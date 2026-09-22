import { describe, expect, test, tier } from 'claude-code/testing'

import { displayWidth, drawing } from '../../../hooks/features/mermaid/render.mjs'

tier('user')

/** A left-to-right chain draws as three rows: top border, labels, bottom. */
const chain = (label: string) => `flowchart LR\n  A[${label}] --> B[${label}]`

/**
 * These guard the bundle, not the plugin. `scripts/build-renderers.mjs` pins
 * a version of an outside renderer, and a renderer that draws crooked boxes
 * is worse than one that does not draw: crooked boxes are the whole
 * complaint this feature exists to answer.
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
		for (const useAscii of [false, true]) {
			test(`a ${name} label draws a rectangle, useAscii ${useAscii}`, async () => {
				const lines = drawing(chain(label), { columns: 120, useAscii })?.split('\n') ?? []

				// One rank, so every row of the drawing is one rectangle's width.
				expect(lines.length).toBeGreaterThan(2)
				expect(new Set(lines.map(displayWidth)).size).toBe(1)
			})
		}
	}

	test('ascii mode draws nothing a webview would widen', async () => {
		const drawn = drawing(chain('開始'), { columns: 120, useAscii: true }) ?? ''

		expect(/[─-╿▶◀▲▼]/.test(drawn)).toBe(false)
	})

	test('a diagram wider than the room is kept as its source', async () => {
		expect(drawing(chain('あ'.repeat(40)), { columns: 40, useAscii: false })).toBeNull()
	})

	test('a kind the renderer does not know is kept as its source', async () => {
		expect(drawing('not a diagram at all', { columns: 80, useAscii: false })).toBeNull()
	})

	test('a dense graph routes no edge through a label', async () => {
		// Taking the padding out of a box saves rows and buys this: the renderer
		// runs an edge across a label, and `Failed` comes out as `Fai|ed`.
		const drawn =
			drawing(
				'flowchart LR\n  Failed -->|retry| InProgress\n  InProgress -->|fail| Failed\n  InProgress -->|complete| Done',
				{ columns: 200, useAscii: true },
			) ?? ''

		expect(/[A-Za-z][|+][A-Za-z]/.test(drawn)).toBe(false)
	})

	test('a state diagram draws, which the previous renderer refused', async () => {
		const drawn = drawing('stateDiagram-v2\n  [*] --> 待機\n  待機 --> [*]', {
			columns: 120,
			useAscii: false,
		})

		expect(drawn).not.toBeNull()
	})

	test('labelled edges that converge draw, which the previous renderer refused', async () => {
		const drawn = drawing(
			'flowchart TD\n  A[受信] --> B{判定}\n  B -->|yes| G[使う]\n  B -->|no| C[実行]\n  C --> G',
			{ columns: 120, useAscii: false },
		)

		expect(drawn).not.toBeNull()
	})
})

describe('label padding', () => {
	test('a label is given room on both sides', async () => {
		const drawn = drawing('flowchart LR\n  A[解析] --> B[描画]', { columns: 120, useAscii: false }) ?? ''

		expect(drawn).toContain('  解析  ')
	})

	test('a bracket inside a quoted label is left alone', async () => {
		// The padding follows a node's id, so `[0]` here is not a node's shape.
		const drawn = drawing('flowchart LR\n  A["配列 [0] を読む"] --> B[次]', {
			columns: 120,
			useAscii: false,
		}) ?? ''

		expect(drawn).toContain('配列 [0] を読む')
	})
})

describe('ascii mode', () => {
	for (const [name, source] of [
		['flowchart', 'flowchart TD\n  A([start]) --> B{choose}\n  B -->|y| C((done))'],
		['state', 'stateDiagram-v2\n  [*] --> Pending\n  Pending --> [*]: done'],
		['sequence', 'sequenceDiagram\n  participant A\n  participant B\n  A->>B: req'],
		['class', 'classDiagram\n  class Order {\n    +int id\n  }'],
		['er', 'erDiagram\n  CUSTOMER ||--o{ ORDER : places'],
	] as const) {
		test(`a ${name} drawn for a webview is ASCII alone`, async () => {
			// The renderer leaves a `‖` in a state diagram's end marker even in
			// this mode, and that character is East Asian Ambiguous: a webview's
			// CJK font draws it two columns wide and the row shifts.
			const drawn = drawing(source, { columns: Number.POSITIVE_INFINITY, useAscii: true }) ?? ''

			expect(drawn).not.toBe('')
			expect(/[^\x00-\x7F]/u.test(drawn)).toBe(false)
		})
	}
})
