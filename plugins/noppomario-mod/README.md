# noppomario-mod

noppomario's mods for Claude Code, in one plugin. A plugin may name exactly
one hooks module, so each feature lives under `hooks/features/<name>/` and
`hooks/register.ts` composes them.

## mermaid

Draws the mermaid code fences in Claude's replies where they stand, and tells
the model, once per conversation, to write diagrams as fences rather than draw
them by hand. Laying a diagram out means counting display columns and a model
counts characters, so a label in a wide script comes out crooked; a fence
hands that arithmetic to code.

### Where it draws

| Surface | How | What |
| --- | --- | --- |
| Terminal | `ui.render` | Box-drawing text |
| Editor, desktop, mobile | `ui.render` | SVG |
| A session that draws nowhere | `MessageDisplay` | ASCII text |

The VS Code extension runs the agent as a stream-json client, where the engine
draws nowhere and `ui.render` is never raised. So the panel is served by the
`MessageDisplay` fallback today, and the SVG path sits dormant and starts
working the day the extension attaches as a surface — no change here. Only one
of them draws at a time: the hooks module sets an environment variable when a
surface attaches, and the fallback stands down when it sees it.

The fallback draws with `- | +`. Box-drawing characters are East Asian
Ambiguous, and a webview takes its font's word for their width; a terminal
places by cell and VS Code draws them itself, so it can be trusted with them.

### The renderer

[`zombie-mermaid`](https://github.com/dfadler/zombie-mermaid), MIT, bundled
into `hooks/features/mermaid/vendor/`. A hooks module may import only its own
files and Claude Code installs no dependencies for a plugin, so the bundles are
committed. Rebuild after changing the pinned version:

```sh
npm install
npm run renderers
```

The SVG bundle is over the 1,048,576 bytes a hooks module will read, so
`hooks/render-svg.mjs` draws in a child process.

Draws flowchart, sequenceDiagram, stateDiagram, classDiagram and erDiagram. A
fence keeps its source when it does not parse or lays out wider than the
terminal.

### Tests

```sh
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test plugins/noppomario-mod
```

`draw-text.test.ts` and `draw-svg.test.ts` mount `AssistantMessage` through the
plugin on a named surface and read the drawing back. The SVG tests name
surfaces nothing raises today, which is how that path is held to its contract
before it can run. `renderer.test.ts` guards the bundle: a renderer that draws
crooked boxes is worse than one that does not draw.
