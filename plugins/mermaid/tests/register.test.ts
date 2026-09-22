import { describe, expect, test, tier } from 'claude-code/testing'

tier('user')

const FENCED = '```mermaid\ngraph LR\n  A[One] --> B[Two]\n```'

describe('register', () => {
	test('a mermaid fence is drawn where it stood', async ($, on) => {
		on('ui.render', ($, e) => {
			const { Text } = $.ui.resolve(e)
			return Text({ children: 'text' in e.props ? e.props.text : '' })
		})

		const ui = await $.ui.mount({
			plugin: 'mermaid',
			surface: 'terminal',
			component: 'AssistantMessage',
			props: { text: FENCED, isFirstOfReply: true },
		})

		expect(await ui.find({ text: /┌/ })).toBeDefined()
		expect(await ui.find({ text: /```mermaid$/ })).toBeUndefined()
		await ui.unmount()
	})

	test('a reply with no fence is left alone', async ($, on) => {
		on('ui.render', ($, e) => {
			const { Text } = $.ui.resolve(e)
			return Text({ children: 'text' in e.props ? e.props.text : '' })
		})

		const ui = await $.ui.mount({
			plugin: 'mermaid',
			surface: 'terminal',
			component: 'AssistantMessage',
			props: { text: 'just prose', isFirstOfReply: true },
		})

		expect(await ui.find({ text: /just prose/ })).toBeDefined()
		await ui.unmount()
	})
})
