import { describe, expect, test, tier } from 'claude-code/testing'

tier('user')

const FENCED = 'before\n\n```mermaid\nflowchart LR\n  A[API受信] --> B[完了]\n```\n\nafter'

/**
 * The surfaces that carry `Svg` raise nothing today: the VS Code extension
 * runs the agent as a stream-json client, where the engine draws nowhere.
 * The kit mounts a component on any surface it is told to, so the path can be
 * held to its contract now and start working unchanged the day a client
 * attaches.
 *
 * The renderer runs in a child process, which a test answers in its place:
 * what the markup says is `renderer.test.ts`'s business, what the tree looks
 * like is this file's.
 */
describe('draw-svg', () => {
	for (const surface of ['vscode', 'desktop', 'mobile'] as const) {
		test(`a fence draws as an Svg on ${surface}`, async ($, on) => {
			on('process.run', () => ({
				value: { exitCode: 0, stdout: '<svg xmlns="http://www.w3.org/2000/svg"></svg>', stderr: '' },
			}))
			on('ui.render', ($, e) => {
				const { Text } = $.ui.resolve(e)
				return Text({ children: 'text' in e.props ? e.props.text : '' })
			})

			const ui = await $.ui.mount({
				plugin: 'noppomario-mod',
				surface,
				component: 'AssistantMessage',
				props: { text: FENCED, isFirstOfReply: true },
			})

			expect(await ui.find({ type: 'Svg' })).toBeDefined()
			expect(await ui.find({ type: 'Markdown', text: /before/ })).toBeDefined()
			expect(await ui.find({ type: 'Markdown', text: /after/ })).toBeDefined()
			await ui.unmount()
		})
	}

	test('a reply with no fence is left to the chain', async ($, on) => {
		on('process.run', () => ({
			value: { exitCode: 0, stdout: '<svg xmlns="http://www.w3.org/2000/svg"></svg>', stderr: '' },
		}))
		on('ui.render', ($, e) => {
			const { Text } = $.ui.resolve(e)
			return Text({ children: 'text' in e.props ? e.props.text : '' })
		})

		const ui = await $.ui.mount({
			plugin: 'noppomario-mod',
			surface: 'vscode',
			component: 'AssistantMessage',
			props: { text: 'just prose', isFirstOfReply: true },
		})

		expect(await ui.find({ type: 'Svg' })).toBeUndefined()
		expect(await ui.find({ text: /just prose/ })).toBeDefined()
		await ui.unmount()
	})
})
