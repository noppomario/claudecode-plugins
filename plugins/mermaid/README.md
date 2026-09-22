# mermaid

Draws the mermaid code fences in Claude's replies as box-drawing text, in
place, on the terminal.

```text
             ┌─────────────┐
             │ Parse fence │
             └──────┬──────┘
                    │
                    ▼
             ┌─────────────┐
             │ Fits width? │
             └──────┬──────┘
                    │
          ┌─────────┴────────┐
         yes                no
          ▼                  ▼
  ┌──────────────┐    ┌─────────────┐
  │ Draw box art │    │ Keep source │
  └──────────────┘    └─────────────┘
```

A mod: it hooks `ui.render`, so the drawing is on screen only. The transcript
and what Claude reads keep the fence.

## Why the fence and not the diagram

Drawing a diagram out of characters means laying it out in two dimensions and
counting display columns. A model counts characters, and a label in Japanese
or any other wide script takes two columns per character, so a hand-drawn box
comes out crooked — the misalignment that makes a diagram unreadable.

So the mod also tells the model, once per conversation, to write diagrams as
mermaid fences and not to hand-draw them. The arithmetic then belongs to code
that measures every grapheme before placing anything. The guidance is added
only where the drawing happens: a session that draws nowhere is told nothing,
since a fence nothing draws would be worse than a crooked box.

## The renderer

The drawing itself is Claude Code's own Mermaid renderer, which ships inside
the binary as a built-in plugin that is gated off by default. This mod calls
that renderer from a hook of its own, which no gate covers.

The renderer is Anthropic's code, so it is not committed. It is taken from
the copy of Claude Code on the machine that runs it:

```sh
node scripts/extract-renderer.mjs           # finds the binary itself
node scripts/extract-renderer.mjs /path/to/claude
```

The script reads the module's own export table rather than assuming minified
names, and refuses to write a slice that does not draw. Run it again after
Claude Code updates.

## What it draws

`flowchart` and `graph` in all four directions, and `sequenceDiagram`. A
fence keeps its source when it is not one of those, does not parse, throws,
or lays out wider than the terminal — a failure shows the diagram's text
rather than nothing.

## Surfaces

`terminal` only, and deliberately. The VS Code extension launches the agent
as a stream-json client: the engine draws nowhere, `session.start` reports
`surface=null`, and `ui.render` is never raised, so a hook registered for
`vscode` would never run. That surface needs the `MessageDisplay` route
instead.

## Tests

```sh
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test plugins/mermaid
```

The tests mount `AssistantMessage` through the plugin on the terminal
surface and read the drawing back, so they exercise the hook against the
engine rather than against a copy of it.
