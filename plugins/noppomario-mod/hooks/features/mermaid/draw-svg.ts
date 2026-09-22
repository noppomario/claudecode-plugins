import type { BoxProps, ElementConstructor, MarkdownProps, On, RenderElement, SvgProps } from 'claude-code'

import { FENCE, HAS_FENCE } from './render.mjs'

// The renderer's bundle is 1.6MB, over the 1,048,576 bytes a hooks module
// will read, so a child process imports it instead. The limit is on what the
// module graph reads, not on what a process the plugin starts may open.
const CHILD = new URL('./render-svg.mjs', import.meta.url).pathname

// Naming a font also drops the webfont import the renderer would write. An
// SVG drawn as an image loads nothing from outside itself, so a link to a
// font on the network is markup that measures one thing and draws another.
const FONT = 'system-ui'

const PALETTE = {
	dark: { bg: '#1e1e1e', fg: '#d4d4d4', line: '#808080', accent: '#4ec9b0' },
	light: { bg: '#ffffff', fg: '#24292f', line: '#6e7781', accent: '#0550ae' },
}

const MAX_ENTRIES = 32

/** The elements this draws with; every surface that has `Svg` has these. */
type Table = {
	Box: ElementConstructor<BoxProps>
	Markdown: ElementConstructor<MarkdownProps>
	Svg: ElementConstructor<SvgProps>
}

// What a closure would hold: the engine wants each hook declared where it can
// read it, so the hooks stay small. Resets when the module reloads.
const drawn = new Map<string, string>()
let palette: keyof typeof PALETTE | null = null

/** A drawing per fence, markdown for the prose between; null if none drew. */
async function treeOf(table: Table, text: string, draw: (source: string) => Promise<string | null>) {
	const children: RenderElement[] = []
	let read = 0

	for (const match of text.matchAll(FENCE)) {
		const markup = await draw(match[3] ?? '')
		if (markup === null) continue

		const before = text.slice(read, match.index)
		if (before.trim() !== '') children.push(table.Markdown({ text: before }))
		children.push(table.Svg({ source: markup, alt: altOf(match[3] ?? '') }))
		read = (match.index ?? 0) + match[0].length
	}

	if (children.length === 0) return null

	const after = text.slice(read)
	if (after.trim() !== '') children.push(table.Markdown({ text: after }))

	return table.Box({ flexDirection: 'column', gap: 1, children })
}

type Runner = {
	process: {
		run: (
			argv: readonly string[],
			init?: { stdin?: string },
		) => Promise<{ exitCode: number; stdout: string }>
	}
}

/** Draws one source in the child, remembering it by source and palette. */
async function svgOf($: Runner, source: string) {
	const key = `${palette}\n${source}`
	const known = drawn.get(key)
	if (known !== undefined) return known

	const ask = JSON.stringify({ source, options: { font: FONT, ...PALETTE[palette ?? 'dark'] } })
	const { exitCode, stdout } = await $.process
		.run(['node', CHILD], { stdin: ask })
		.catch(() => ({ exitCode: 1, stdout: '' }))

	if (exitCode !== 0 || stdout === '') return null

	if (drawn.size >= MAX_ENTRIES) drawn.delete(drawn.keys().next().value ?? '')
	drawn.set(key, stdout)
	return stdout
}

// A surface without the element draws nothing else of it, so the alt carries
// the diagram itself.
function altOf(source: string) {
	const kind = source.trim().split(/\s|\n/)[0] ?? 'diagram'
	const labels = [...source.matchAll(/[[({]"?([^\]"})|]+)"?[\])}]/g)].map(([, label]) => label)
	return labels.length === 0 ? `A ${kind}` : `A ${kind}: ${labels.join(', ')}`
}

/**
 * Registers the drawing on every surface whose element table carries `Svg`:
 * the editor, the desktop app and the mobile app.
 *
 * None of them raises `ui.render` today — the VS Code extension runs the
 * agent as a stream-json client, where the engine draws nowhere — so this
 * sits dormant and starts working the day a client attaches, unchanged.
 *
 * Written out per surface: the engine reads a matcher off the source, where
 * a loop variable would not resolve to a surface.
 *
 * @param on the engine's registrar
 */
export function register(on: On) {
	on('config.set', { key: 'theme' }, ($, e, next) => {
		palette = null
		drawn.clear()
		$.ui.invalidate('ui.render')
		return next(e)
	})

	on('ui.render', { component: 'AssistantMessage', surface: 'vscode', props: { text: HAS_FENCE } }, async ($, e, next) => {
		await paletteOf($)
		const { Box, Markdown, Svg } = $.ui.resolve(e)
		return (await treeOf({ Box, Markdown, Svg }, e.props.text, (source) => svgOf($, source))) ?? next(e)
	})

	on('ui.render', { component: 'AssistantMessage', surface: 'desktop', props: { text: HAS_FENCE } }, async ($, e, next) => {
		await paletteOf($)
		const { Box, Markdown, Svg } = $.ui.resolve(e)
		return (await treeOf({ Box, Markdown, Svg }, e.props.text, (source) => svgOf($, source))) ?? next(e)
	})

	on('ui.render', { component: 'AssistantMessage', surface: 'mobile', props: { text: HAS_FENCE } }, async ($, e, next) => {
		await paletteOf($)
		const { Box, Markdown, Svg } = $.ui.resolve(e)
		return (await treeOf({ Box, Markdown, Svg }, e.props.text, (source) => svgOf($, source))) ?? next(e)
	})
}

/** Reads the engine's theme once; a failed read is no reason not to draw. */
async function paletteOf($: { config: { list: () => Promise<readonly { key: string; value: unknown }[]> } }) {
	if (palette !== null) return

	const rows = await $.config.list().catch(() => [])
	const theme = rows.find((row) => row.key === 'theme')
	palette = String(theme?.value ?? 'dark').startsWith('light') ? 'light' : 'dark'
}
