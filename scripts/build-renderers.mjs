// Bundles the Mermaid renderers into the mermaid feature's vendor folder.
//
// A hooks module may import its own files by relative path and `claude-code`,
// nothing else: no node_modules, and Claude Code installs no dependencies for
// a plugin. So the renderer travels with the plugin, and the bundles are
// committed — a marketplace install copies files and runs no build.
//
// Two bundles, because the SVG path carries elkjs and the text path does not:
// 1.4MB of the 1.7MB total is the layout engine. `draw-svg.ts` imports its
// bundle dynamically, so nothing loads it until a surface that draws Svg
// attaches. Run this after changing the pinned version of zombie-mermaid.

import { build } from 'esbuild'
import { statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'plugins/noppomario-mod/hooks/features/mermaid/vendor')

/** The entry each bundle re-exports, and where it lands. */
const BUNDLES = [
	{ exports: 'renderMermaidASCII', from: 'zombie-mermaid/ascii', file: 'zombie-text.mjs' },
	{ exports: 'renderMermaidSVG', from: 'zombie-mermaid', file: 'zombie-svg.mjs' },
]

for (const { exports, from, file } of BUNDLES) {
	const out = resolve(OUT, file)

	await build({
		stdin: {
			contents: `export { ${exports} } from '${from}'`,
			resolveDir: ROOT,
			sourcefile: file,
		},
		bundle: true,
		format: 'esm',
		// Neither Node nor a browser: the hooks module has neither, and the
		// build fails loudly if anything reaches for a Node builtin.
		platform: 'neutral',
		minify: true,
		legalComments: 'none',
		outfile: out,
	})

	process.stdout.write(`${String(statSync(out).size).padStart(9)}  ${file}\n`)
}
