// Carves the Mermaid renderer out of the Claude Code binary on this machine
// and writes it beside the mermaid mod's hooks module.
//
// The renderer is Anthropic's code, so it is not committed: it is taken from
// the copy of Claude Code the person already runs, on their own machine, and
// `plugins/mermaid/hooks/renderer.mjs` is ignored. Run this once after
// cloning, and again after Claude Code updates.
//
// The binary is a Bun single-file executable and holds its modules as plain
// text. The anchors below are the module's own export table, so the minified
// names are read from the build rather than assumed.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { glob } from 'node:fs/promises'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'plugins/mermaid/hooks/renderer.mjs')

/** The module's description, which no other module carries. */
const ANCHOR = 'Mermaid diagrams in the terminal'

/**
 * @returns the path of the Claude Code binary to read
 */
async function binaryPath() {
	if (process.argv[2]) return process.argv[2]

	for await (const hit of glob(
		`${process.env.HOME}/.vscode*/extensions/anthropic.claude-code-*/resources/native-binary/claude`,
	)) {
		return hit
	}

	const onPath = execFileSync('sh', ['-c', 'command -v claude'], { encoding: 'utf8' }).trim()
	if (onPath) return execFileSync('readlink', ['-f', onPath], { encoding: 'utf8' }).trim()

	throw new Error('no Claude Code binary found; pass one as the first argument')
}

/**
 * @param text the module's source, from its export table onwards
 * @param name the export the table maps
 * @returns the minified name that export is bound to
 */
function boundName(text, name) {
	const match = new RegExp(`${name}:\\(\\)=>([A-Za-z_$][\\w$]*)`).exec(text)
	if (!match) throw new Error(`the build's mermaid module does not export ${name}`)
	return match[1]
}

const path = await binaryPath()
const binary = readFileSync(path, 'latin1')

// The description appears twice: in the plugin registry and in the module.
const anchored = binary.lastIndexOf(ANCHOR)
if (anchored < 0) throw new Error(`${path} holds no mermaid module (${ANCHOR})`)

const renderMermaid = boundName(binary.slice(anchored, anchored + 4096), 'renderMermaid')
const withDiagrams = boundName(binary.slice(anchored, anchored + 4096), 'withDiagrams')

// The renderer starts after the export table and ends where the hook's own
// code begins, at the regular expression that finds a mermaid fence.
const tableEnd = binary.indexOf('});', binary.indexOf(`withDiagrams:()=>${withDiagrams}`))
const fence = binary.indexOf('=/^ {0,3}(?:', tableEnd)
const hooks = binary.lastIndexOf('var ', fence)
if (tableEnd < 0 || fence < 0 || hooks < 0) throw new Error('the module does not slice as expected')

const source = binary.slice(tableEnd + 3, hooks)
const header = `// Extracted from ${path} by scripts/extract-renderer.mjs.\n// (c) Anthropic PBC. Not covered by this repository's license.\n`
const exports = `\nexport { ${renderMermaid} as renderMermaid, ${withDiagrams} as withDiagrams };\n`

writeFileSync(OUT, `${header}${source}${exports}`, 'latin1')

if (!existsSync(OUT)) throw new Error(`nothing written to ${OUT}`)
const { renderMermaid: render } = await import(OUT)
const drawn = render('graph TD\n  A[ok] --> B[ok]\n', 80, () => {})
if (!drawn) throw new Error('the extracted renderer drew nothing; the slice is wrong')

process.stdout.write(`wrote ${OUT} (${source.length} bytes, drew a ${drawn.kind})\n`)
