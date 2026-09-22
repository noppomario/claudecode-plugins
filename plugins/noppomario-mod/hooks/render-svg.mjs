#!/usr/bin/env node
// Draws one mermaid source as SVG and writes it to stdout.
//
// It runs as a child process rather than inside the hooks module because the
// renderer carries a layout engine: the bundle is 1.6MB, and a hooks module
// refuses to import a file over 1,048,576 bytes. Nothing here is loaded until
// a surface that draws `Svg` asks for a diagram.
//
// Input on stdin: `{ "source": "...", "options": { ... } }`.
// Output on stdout: the markup, or nothing when it did not draw.

import { renderMermaidSVG } from './features/mermaid/vendor/zombie-svg.mjs'

let input = ''
for await (const chunk of process.stdin) input += chunk

let ask
try {
	ask = JSON.parse(input)
} catch {
	process.exit(1)
}

try {
	process.stdout.write(renderMermaidSVG(String(ask.source ?? ''), ask.options ?? {}))
} catch {
	process.exit(1)
}
