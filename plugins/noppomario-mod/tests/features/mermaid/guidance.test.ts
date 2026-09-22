import { describe, expect, test, tier } from 'claude-code/testing'

tier('user')

describe('guidance', () => {
	test('a conversation is told to write fences', async ($, on) => {
		on('session.start', ($, e) => ({ cwd: e.cwd }))
		on('prompt.context', ($, e) => ({ blocks: e.blocks }))

		await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
		const { blocks } = await $.prompt.context({ blocks: [] })

		expect(blocks.map((b) => b.name)).toContain('mermaidDiagrams')
	})

	test('a session that draws nowhere is told too, since the fallback draws', async ($, on) => {
		on('session.start', ($, e) => ({ cwd: e.cwd }))
		on('prompt.context', ($, e) => ({ blocks: e.blocks }))

		await $.session.start({ surface: null, isInteractive: false, cwd: '/work' })
		const { blocks } = await $.prompt.context({ blocks: [] })

		expect(blocks.map((b) => b.name)).toContain('mermaidDiagrams')
	})
})
