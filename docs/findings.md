# Findings

What was learned about Claude Code's plugin and rendering contracts while
building this repository, against build 2.1.278. None of it is in the
documentation; most of it cost an experiment to establish. It is written down
because the next piece of work will ask the same questions.

The API is early access and moves between releases. Re-check anything here
before relying on it.

## A plugin may name exactly one hooks module

`hooks/hooks.json` takes a `modules` array, but a second entry is refused:

```text
modules: hooks.json `modules` names one hooks module per plugin; a second entry is refused
```

Several features in one plugin therefore compose inside one `register()`,
importing sibling files by relative path. That is what
`plugins/noppomario-mod/hooks/register.ts` does.

## Two plugins that rewrite the same render site collide

A diagnostic plugin that rewrote `AssistantMessage`'s `props.text` silently
discarded the mermaid mod's drawing at the same site. Only the probe's rewrite
appeared; no error was reported anywhere. The engine reports rewrite
collisions on other events as last-registered-wins
([#88338](https://github.com/anthropics/claude-code/issues/88338)), and this
behaved the same way.

Practical consequence: features that touch one site belong in one plugin,
where their order is the author's to choose.

## The VS Code extension never raises `ui.render`

The extension launches the agent as a stream-json client:

```text
claude --output-format stream-json --input-format stream-json --verbose
       --permission-prompt-tool stdio --include-partial-messages
       --debug --debug-to-stderr --setting-sources=user,project,local
```

That is the mode the types describe as drawing nowhere. A `session.start` hook
in a VS Code session reports:

```text
session.start surface=null interactive=false
```

So no `ui.render` event is ever raised there, and the panel renders the stream
itself. The `Elements` table does declare a `vscode` surface carrying `Svg`,
and `SvgProps` says "the desktop and the editor draw it as an image", but
nothing reaches it from the extension as it ships.

## `MessageDisplay` is honoured in that mode, and its text field is `delta`

The event's input is not `message_text`, whatever the blog posts say. Captured
from a live run:

```json
{"index":0,"final":true,"delta":"hello world","message_id":"6dd05a61-..."}
```

The full set of fields: `cwd`, `delta`, `final`, `hook_event_name`, `index`,
`message_id`, `prompt_id`, `scratchpad_dir`, `session_id`, `transcript_path`,
`turn_id`. `delta` is the batch of newly completed lines this call covers, not
the whole message.

Answering with `hookSpecificOutput.displayContent` replaces what is displayed.
In stream-json mode the replacement lands on the completed `assistant`
message; the `stream_event` deltas still carry the original, so under
`--include-partial-messages` the original streams in and the replacement
arrives when the message completes.

A plugin's `MessageDisplay` hook is declared under `hooks` in `hooks.json`,
not `modules`: it is a classic command hook, not a function hook.

## What the VS Code panel's renderer accepts

Measured by replacing a reply with a battery of candidates:

| Candidate | Result |
| --- | --- |
| Markdown image, `file://` URL | `[Image]` placeholder |
| Markdown image, `data:` URI | `[Image]` placeholder |
| HTML `<img>` | drawn as its own markup |
| Inline `<svg>` | drawn as its own markup |
| `mermaid` fence | an ordinary code block |
| HTML `<details>` | drawn as its own markup |
| ANSI escape | the control characters, visibly |

Markdown itself is parsed — headings, emphasis and code blocks all render. So
the panel takes plain markdown text and nothing else. The image node is
recognised and refused, which is
[#79436](https://github.com/anthropics/claude-code/issues/79436) /
[#95797](https://github.com/anthropics/claude-code/issues/95797); if that
lands, the two image rows become viable with no other change.

Box-drawing text does not survive there either: inside a code fence it comes
out crooked, because the panel's font falls back for box-drawing glyphs and
the fallback's advance width does not match the grid. The same text is exact
in a terminal.

## A hooks module reads no file over 1,048,576 bytes

The module and everything it imports, each file:

```text
<module>: <file> is over 1048576 bytes and was not read
```

This decided where the SVG renderer runs. Its bundle is 1.6MB — 1.4MB of that
is elkjs, the layout engine — so it cannot be imported at all. It runs in a
child process the hook starts with `$.process.run` instead; the limit is on
what the module graph reads, not on what a process the plugin starts may open.

Two smaller findings from the same loader:

- A relative dynamic `import()` **works**. A sibling `.mjs` loaded with
  `await import('./late.mjs')` resolves at first call.
- `import.meta.url` is a real file URL inside a hooks module, which is how a
  hook finds a sibling script to run.

## What the engine wants spelled out literally

The loader reads a module's source to list what it touches, so several things
must be literals and not variables:

- `$.env.set("NAME", …)` — a variable name is refused, naming the variable
- a matcher's `surface` — a loop over `['vscode', 'desktop'] as const`
  registers `surface=surface`, which matches nothing
- the hook itself — it must be a function declared at the top of its file, a
  const bound to one there, an import, or written inline at the `on` call. A
  const inside `register` is refused

`claude plugin validate` prints what it read, which is the quickest way to
see that a matcher resolved.

## Claude Code ships a gated mermaid mod, and it is not the whole answer

Build 2.1.278 carries a built-in plugin named `mermaid`:

```js
var ae = false                                                  // isOnByDefault
var de = () => Q4t() && !Sh() && ql("tengu_mermaid_mod", ae)    // isAvailable
var ce = "Mermaid diagrams in the terminal: flowcharts and sequence diagrams
          in a reply's mermaid code fences are drawn in place as box-drawing text"
```

`Q4t()` is function hooks being enabled, `Sh()` is screen reader mode, and
`tengu_mermaid_mod` is a server-side gate that defaults off. It is not in
`anthropics/claude-code/mods`, not in the CHANGELOG, and not in the docs; the
gate first appears in 2.1.277. `tengu_agents_md_mod` is the same shape and did
ship, so this one plausibly will too.

Its hooks module scans as `{hooks: ["ui.render"], calls: []}`: one hook, no
calls on `$`. **It never tells the model anything.** It draws the fences the
model chose to write, which is half of
[#14375](https://github.com/anthropics/claude-code/issues/14375) — the half
that does not address hand-drawn ASCII diagrams at all.

The gate sits in `isAvailable`, which decides whether that plugin registers.
It covers neither the renderer nor `ui.render`, so a plugin of one's own can
call the same renderer today, which is what this repository did first — by
carving the renderer out of the binary, since it is not published.

That is no longer how it works. `zombie-mermaid` is MIT, draws the same
diagrams correctly for CJK, draws three kinds the built-in renderer does not
(state, class, ER), does not refuse a labelled edge that converges, and emits
SVG as well as text. It is a dependency rather than an act of archaeology.

## Why hand-drawn diagrams come out crooked

A model pads by counting characters; a terminal places by counting display
columns. A label in Japanese or any other wide script takes two columns per
character, so a box padded to the right number of characters is the wrong
number of columns wide, and the border misses the content by exactly the
number of wide characters inside it.

Nothing on the rendering side fixes this: the terminal draws faithfully what
was written. The fix is either to stop the model laying diagrams out by hand,
or to redraw what it wrote.

The renderer measures every grapheme (`Intl.Segmenter` plus an East Asian
Width table) before placing anything, so its boxes are exact. Box-drawing
characters are East Asian Ambiguous, so a terminal configured to draw
ambiguous characters at two columns would break them — but it would break
every box equally, which makes the condition easy to spot.

## Why the built-in renderer was left behind

It refuses a labelled edge that converges:

```js
if (c.some((d, m) => d !== "" && (h[m] ?? 0) > 1)) return
```

`h` counts incoming edges per node and `c` holds one label per node, so two
labels landing on one node would be drawn at the same column. It gives up on
the whole diagram rather than draw it wrong. A `yes` and a `no` branch that
rejoin is the commonest shape in a flowchart, so this fired often.

It also draws only flowcharts and sequence diagrams, and only as text.

## The library that replaced it, and the one it forked from

`beautiful-mermaid` (11k stars) has the CJK bug this whole feature exists to
avoid: its ASCII grid measures width in code points, so a Japanese label
pushes the border out. Two issues report it
([#119](https://github.com/lukilabs/beautiful-mermaid/issues/119),
[#122](https://github.com/lukilabs/beautiful-mermaid/issues/122)) and a fix
PR ([#128](https://github.com/lukilabs/beautiful-mermaid/pull/128)) has sat
unmerged since June 2026. The repository has not been pushed since May.

`zombie-mermaid` is a maintained fork that took the fix: it measures display
width and writes a wide grapheme into two cells. Verified here — Japanese,
mixed scripts, halfwidth katakana and ambiguous-width labels all come out as
rectangles, in both box-drawing and ASCII mode.
