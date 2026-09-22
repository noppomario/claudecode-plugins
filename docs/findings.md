# Findings

What Claude Code's plugin and rendering contracts turned out to be, against
build 2.1.278. None of it is documented and most of it cost an experiment.
The API is early access; re-check before relying on any of it.

## The hooks loader

**One hooks module per plugin.** A second entry in `modules` is refused:

```text
modules: hooks.json `modules` names one hooks module per plugin; a second entry is refused
```

So several features compose inside one `register()`, importing siblings by
relative path.

**No file over 1,048,576 bytes**, for the module and everything it imports:

```text
<module>: <file> is over 1048576 bytes and was not read
```

The SVG renderer's bundle is 1.6MB (1.4MB of it elkjs), so it runs in a child
process started with `$.process.run`. The limit is on what the module graph
reads, not on what a process the plugin starts may open.

**Relative dynamic `import()` works**, and `import.meta.url` is a real file
URL — which is how a hook finds a sibling script to run.

**Several things must be literals**, because the loader reads the source to
list what a module touches:

- `$.env.set("NAME", …)` — a variable name is refused, naming the variable
- a matcher's `surface` — a loop over `['vscode', 'desktop'] as const`
  registers `surface=surface`, which matches nothing
- the hook — a function declared at the top of its file, a const bound to one
  there, an import, or written inline at the `on` call. A const inside
  `register` is refused

`claude plugin validate` prints what it read.

**Two plugins that rewrite the same render site collide.** A probe rewriting
`AssistantMessage`'s `props.text` silently discarded the mermaid drawing at
the same site, with no error anywhere. Same shape as
[#88338](https://github.com/anthropics/claude-code/issues/88338). Features
that touch one site belong in one plugin, where their order is the author's.

## The VS Code extension never raises `ui.render`

It launches the agent as a stream-json client:

```text
claude --output-format stream-json --input-format stream-json --verbose
       --permission-prompt-tool stdio --include-partial-messages
       --debug --debug-to-stderr --setting-sources=user,project,local
```

which is the mode the types describe as drawing nowhere. `session.start`
there reports `surface=null interactive=false`. The `Elements` table does
declare a `vscode` surface carrying `Svg`, and `SvgProps` says "the desktop
and the editor draw it as an image", but nothing in the extension reaches it.

## `MessageDisplay` fills that gap, and its text field is `delta`

Not `message_text`, whatever the blog posts say. Captured live:

```json
{"index":0,"final":true,"delta":"hello world","message_id":"6dd05a61-..."}
```

Fields: `cwd`, `delta`, `final`, `hook_event_name`, `index`, `message_id`,
`prompt_id`, `scratchpad_dir`, `session_id`, `transcript_path`, `turn_id`.
`delta` is the batch of newly completed lines, not the whole message.

`hookSpecificOutput.displayContent` replaces what is displayed. In stream-json
mode it lands on the completed `assistant` message; the `stream_event` deltas
still carry the original, so under `--include-partial-messages` the original
streams in and the replacement arrives at the end.

It is a command hook, declared under `hooks` in `hooks.json`, not `modules`.

## What the VS Code panel's renderer accepts

| Candidate | Result |
| --- | --- |
| Markdown image, `file://` or `data:` | `[Image]` placeholder |
| HTML `<img>`, `<svg>`, `<details>` | drawn as its own markup |
| `mermaid` fence | an ordinary code block |
| ANSI escape | the control characters, visibly |

Markdown itself is parsed. So: plain markdown text and nothing else. The image
node is recognised and refused —
[#79436](https://github.com/anthropics/claude-code/issues/79436) /
[#95797](https://github.com/anthropics/claude-code/issues/95797) — and if that
lands, the image rows become viable with no other change.

## A terminal protects a drawing; a webview does not

Box-drawing characters are East Asian Ambiguous, so their width depends on the
font. A drawing made of them survives a terminal anyway, for two reasons that
owe nothing to configuration:

- a terminal places every character by cell, so a glyph wider than its cell is
  clipped and never moves its neighbours
- VS Code's terminal draws U+2500-U+257F, block elements, Braille and
  Powerline itself rather than from the font
  (`terminal.integrated.customGlyphs`, on by default)

A webview has neither: it lays text out by advance width. Measured in
`Noto Sans Mono CJK JP` — what `monospace` resolves to with Noto installed —
per 1000 units of em: `A` 500, and `─ │ ┌ ◇ ▼ ▶ 開` all 1000. So every row
after the first wide glyph shifts.

Hence box characters on the terminal and ASCII in the panel. The alternative
was asking for `editor.fontFamily`, which is a plugin that does not work until
it is configured.

`useAscii` is not quite ASCII either: a state diagram's end marker comes out as
U+2016, ambiguous-width, and shifts its row.

## Why hand-drawn diagrams come out crooked

A model pads by counting characters; a terminal places by counting display
columns. A wide-script label is two columns per character, so a box padded to
the right number of characters is the wrong number of columns wide. Nothing on
the rendering side fixes it — the terminal draws faithfully what was written.
The fix is to stop the model laying diagrams out by hand.

## Claude Code ships a gated mermaid mod

Build 2.1.278 carries a built-in plugin named `mermaid`:

```js
var ae = false                                                  // isOnByDefault
var de = () => Q4t() && !Sh() && ql("tengu_mermaid_mod", ae)    // isAvailable
var ce = "Mermaid diagrams in the terminal: flowcharts and sequence diagrams
          in a reply's mermaid code fences are drawn in place as box-drawing text"
```

`Q4t()` is function hooks enabled, `Sh()` is screen reader mode, and
`tengu_mermaid_mod` is a server-side gate defaulting off. It is not in
`anthropics/claude-code/mods`, the CHANGELOG or the docs; the gate first
appears in 2.1.277. `tengu_agents_md_mod` is the same shape and did ship.

Its module scans as `{hooks: ["ui.render"], calls: []}` — one hook, no calls on
`$`. **It never tells the model anything.** It draws the fences the model chose
to write, which is half of
[#14375](https://github.com/anthropics/claude-code/issues/14375), and not the
half about hand-drawn diagrams.

The gate sits in `isAvailable`, which covers neither the renderer nor
`ui.render`, so a plugin of one's own could call the same renderer — by
carving it out of the binary, since it is not published. This repository did
that first and no longer does.

## The renderer in use, and the two it was chosen over

The built-in one refuses a labelled edge that converges:

```js
if (c.some((d, m) => d !== "" && (h[m] ?? 0) > 1)) return
```

One label slot per node, so two labels landing on one node would be drawn at
the same column, and it gives up on the whole diagram. A `yes` and a `no`
branch that rejoin is the commonest shape in a flowchart. It also draws only
flowcharts and sequence diagrams, and only as text.

`beautiful-mermaid` (11k stars) has the CJK bug this feature exists to avoid:
its ASCII grid measures width in code points. Reported in
[#119](https://github.com/lukilabs/beautiful-mermaid/issues/119) and
[#122](https://github.com/lukilabs/beautiful-mermaid/issues/122), with a fix
PR ([#128](https://github.com/lukilabs/beautiful-mermaid/pull/128)) unmerged
since June 2026 and no push since May.

`zombie-mermaid` is a maintained fork that took the fix: it measures display
width and writes a wide grapheme into two cells. Verified here across
Japanese, mixed scripts, halfwidth katakana and ambiguous-width labels, in
both modes.
