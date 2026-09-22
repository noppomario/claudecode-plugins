# noppomario-mod

noppomario's mods for Claude Code, in one plugin. A plugin may name exactly
one hooks module, so each feature lives under `hooks/features/<name>/` and
`hooks/register.ts` composes them.

## mermaid

Draws the mermaid code fences in Claude's replies where they stand, and tells
the model to write fences rather than draw diagrams by hand.

```text
+-------------+     +-------------+     +----------+
|Parse a fence+---->|Draw it      +---->|Show it   |
+-------------+     +-------------+     +----------+
```

### Why the fence and not the diagram

Drawing a diagram out of characters means laying it out in two dimensions and
counting display columns. A model counts characters, and a label in Japanese
or any other wide script takes two columns per character, so a hand-drawn box
comes out crooked — the misalignment that makes a diagram unreadable.

So the plugin tells the model, once per conversation, to write diagrams as
mermaid fences. The arithmetic then belongs to code that measures every
grapheme before placing anything.

### Where it draws

| Surface | How | What |
| --- | --- | --- |
| Terminal | `ui.render` | Box-drawing text |
| Editor, desktop, mobile | `ui.render` | SVG |
| A session that draws nowhere | `MessageDisplay` | ASCII text |

The VS Code extension runs the agent as a stream-json client, where the
engine draws nowhere and `ui.render` is never raised. So the panel is served
by the `MessageDisplay` fallback today, and the SVG path sits dormant and
starts working the day the extension attaches as a surface — no change here.

Only one of them draws at a time: the hooks module sets an environment
variable when a surface attaches, and the fallback stands down when it sees
it.

The fallback draws with `- | +` rather than `─ │ ┌`. Box-drawing characters
are East Asian Ambiguous, and a webview takes its font's word for their
width: in a CJK monospace font they are two cells wide while the renderer
counts them as one. ASCII is one cell in every monospace font.

### The renderer

[`zombie-mermaid`](https://github.com/dfadler/zombie-mermaid), MIT, bundled
into `hooks/features/mermaid/vendor/`. A hooks module may import only its own
files, and Claude Code installs no dependencies for a plugin, so the bundles
are committed. Rebuild them after changing the pinned version:

```sh
npm install
node scripts/build-renderers.mjs
```

The SVG bundle is 1.6MB, over the 1,048,576 bytes a hooks module will read,
so `hooks/render-svg.mjs` draws in a child process instead. That needs
`node` on `PATH`, as does the `MessageDisplay` fallback.

### What it draws

flowchart, sequenceDiagram, stateDiagram, classDiagram and erDiagram. A fence
keeps its source when it does not parse or lays out wider than the terminal —
a failure shows the diagram's text rather than nothing.

### Tests

```sh
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test plugins/noppomario-mod
```

`draw-text.test.ts` and `draw-svg.test.ts` mount `AssistantMessage` through
the plugin on a named surface and read the drawing back, so they exercise the
hooks against the engine. The SVG tests name surfaces nothing raises today,
which is how that path is held to its contract before it can run.

`renderer.test.ts` guards the bundle: a renderer that draws crooked boxes is
worse than one that does not draw, since crooked boxes are the complaint this
feature exists to answer.
