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
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
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

	const result = await build({
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
		// Keeps the notices a bundled package wrote into its own source.
		legalComments: 'eof',
		metafile: true,
		outfile: out,
	})

	const licences = resolve(OUT, `${file.replace(/\.mjs$/, '')}.LICENSE.md`)
	const { count, kinds, missing } = notices(result.metafile, licences)

	process.stdout.write(`${String(statSync(out).size).padStart(9)}  ${file}\n`)
	process.stdout.write(`           ${basename(licences)}: ${count} packages, ${kinds.join(', ')}\n`)
	for (const name of missing) {
		process.stdout.write(`           no licence file in ${name} — check it by hand\n`)
	}
}

/**
 * Writes the licence of every package the bundle carries beside it.
 *
 * The bundles are redistributed, and each package's licence asks for its
 * notice to travel with the code. esbuild's `legalComments` only keeps what a
 * package wrote inline, which most do not, so the files themselves are read.
 *
 * @param {{ inputs: Record<string, unknown> }} metafile the build's inputs
 * @param {string} out where to write
 * @returns {{ count: number, kinds: string[], missing: string[] }} what it wrote
 */
function notices(metafile, out) {
	const kinds = new Set()
	const missing = []
	const names = new Set()
	for (const input of Object.keys(metafile.inputs)) {
		const match = input.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/)
		if (match) names.add(match[1])
	}

	const sections = [...names].sort().map((name) => {
		const dir = resolve(ROOT, 'node_modules', name)
		const { version, license } = JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8'))
		const file = ['LICENSE', 'LICENSE.md', 'LICENCE', 'LICENSE.txt']
			.map((n) => resolve(dir, n))
			.find((path) => {
				try {
					statSync(path)
					return true
				} catch {
					return false
				}
			})
		kinds.add(license ?? 'unstated')
		if (file === undefined) missing.push(name)
		const text = file === undefined ? '(no licence file in the package)' : readFileSync(file, 'utf8')
		const fence = '`'.repeat(3)
		return `## ${name} ${version} — ${license}\n\n${fence}text\n${text.trim()}\n${fence}\n`
	})

	const header = [
		'# Bundled software',
		'',
		'Written by `npm run renderers`. Every package below is part of the bundle',
		'beside this file, and is redistributed under its own licence. None of them',
		'is modified: each is the published package, bundled as it was installed.',
		'',
		'Source for each is its npm package of the version named below, and its',
		'repository:',
		'',
		...[...names].sort().map((name) => `- https://www.npmjs.com/package/${name}`),
		'',
		'`elkjs` is EPL-2.0, which asks that source be available to anyone who',
		'receives the binary; the npm package above carries it.',
		'',
	].join('\n')

	writeFileSync(out, `${header}\n${sections.join('\n')}`)

	return { count: names.size, kinds: [...kinds].sort(), missing }
}
