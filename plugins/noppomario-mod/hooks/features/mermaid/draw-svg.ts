import type { BoxProps, ElementConstructor, MarkdownProps, On, RenderElement, SvgProps } from 'claude-code'

import { FENCE, HAS_FENCE } from './render.mjs'

/**
 * The child that draws, relative to this file.
 *
 * The renderer carries a layout engine and its bundle is 1.6MB, over the
 * 1,048,576 bytes a hooks module will read. So it is not imported here: a
 * child process imports it and writes the markup back. The limit is on what
 * the module graph reads, not on what a process the plugin starts may open.
 */
const CHILD = new URL('../../render-svg.mjs', import.meta.url).pathname

/**
 * A font the markup can count on. Naming one also drops the webfont import
 * the renderer would otherwise write: an SVG drawn as an image loads nothing
 * from outside itself, so a link to a font on the network is markup that
 * measures one thing and draws another.
 */
const FONT = 'system-ui'

/** Palettes for the two halves of the engine's theme setting. */
const PALETTE = {
	dark: { bg: '#1e1e1e', fg: '#d4d4d4', line: '#808080', accent: '#4ec9b0' },
	light: { bg: '#ffffff', fg: '#24292f', line: '#6e7781', accent: '#0550ae' },
}

/** How many drawings one session keeps, by source and palette. */
const MAX_ENTRIES = 32

/** The elements this draws with; every surface that has `Svg` has these. */
type Table = {
	Box: ElementConstructor<BoxProps>
	Markdown: ElementConstructor<MarkdownProps>
	Svg: ElementConstructor<SvgProps>
}

// What a closure would hold. The engine wants each hook declared where it can
// read it, so the hooks stay small and the state lives here; the module
// reloads with the plugin and this resets with it.
const drawn = new Map<string, string>()
let palette: keyof typeof PALETTE | null = null

/**
 * Builds the tree for one reply: a drawing per fence, markdown for the prose
 * between them.
 *
 * A fence that throws keeps its source, carried by the markdown around it.
 *
 * @param table the surface's elements
 * @param text the reply's markdown
 * @param svgOf draws one source, or answers null
 * @returns the tree, or null when nothing drew and the chain should go on
 */
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

/**
 * Draws one source, remembering it by source and palette.
 *
 * @param $ the engine
 * @param source the mermaid source
 * @returns the markup, or null when it did not draw
 */
async function svgOf(
	$: { process: { run: (argv: readonly string[], init?: { stdin?: string }) => Promise<{ exitCode: number; stdout: string }> } },
	source: string,
) {
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

/**
 * What the drawing says, for a reader that cannot see it. A surface without
 * the element draws nothing else of it, so this carries the diagram itself.
 *
 * @param source the mermaid source
 * @returns a one-line description
 */
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
 * The three registrations are written out because the engine reads a matcher
 * off the source, where a loop variable would not resolve to a surface.
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

/**
 * Reads the engine's theme once and keeps the half it names.
 *
 * @param $ the engine
 */
async function paletteOf($: { config: { list: () => Promise<readonly { key: string; value: unknown }[]> } }) {
	if (palette !== null) return

	// A settings read that fails is no reason not to draw; dark is the default
	// Claude Code ships with.
	const rows = await $.config.list().catch(() => [])
	const theme = rows.find((row) => row.key === 'theme')
	palette = String(theme?.value ?? 'dark').startsWith('light') ? 'light' : 'dark'
}
