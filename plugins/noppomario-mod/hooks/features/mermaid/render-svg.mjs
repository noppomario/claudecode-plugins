#!/usr/bin/env node
// Draws one mermaid source as SVG. In on stdin as
// `{ "source": "...", "options": { ... } }`, out on stdout.
//
// A child process because the renderer's bundle is 1.6MB and a hooks module
// refuses to import a file over 1,048,576 bytes.

import { renderMermaidSVG } from './vendor/zombie-svg.mjs'

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
