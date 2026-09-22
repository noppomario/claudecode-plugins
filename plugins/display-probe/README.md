# display-probe

A diagnostic plugin. When a reply contains `::display-probe::`, the plugin
replaces what the surface displays with a numbered battery of rendering
candidates. Which numbers draw, and which show as their own markup, is the
finding.

It uses the `MessageDisplay` hook, which replaces what is displayed without
touching the transcript or what the model reads.

## Why this and not a mod

A mod's `ui.render` hook never runs under the VS Code extension: the
extension launches the agent as a stream-json client, so the engine draws
nowhere (`session.start` reports `surface=null`, `isInteractive=false`) and
the panel renders the stream itself. `MessageDisplay` is honoured in that
mode — the replacement lands on the completed `assistant` message.

## The event's input

The event hands the hook `delta`, the batch of newly completed lines this
call is being asked about — not the whole message. `index` counts the calls
within one message and `final` marks the last. The full set of fields:

```json
{
  "hook_event_name": "MessageDisplay",
  "delta": "the lines this call covers",
  "index": 0,
  "final": true,
  "message_id": "...",
  "turn_id": "...",
  "prompt_id": "...",
  "session_id": "...",
  "transcript_path": "...",
  "scratchpad_dir": "...",
  "cwd": "..."
}
```

To replace what is drawn, answer on stdout:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "MessageDisplay",
    "displayContent": "what to draw instead"
  }
}
```

Exiting 0 with no output draws the original, which is what this plugin does
for every reply without the token.

## Candidates

| # | Candidate |
| --- | --- |
| 1 | Markdown image, `file://` URL |
| 2 | Markdown image, `data:` URI |
| 3 | HTML `<img>`, `file://` URL |
| 4 | Inline `<svg>` element |
| 5 | `mermaid` fence |
| 6 | HTML `<details>` block |
| 7 | ANSI escape in plain text |

## Use

Ask for a reply containing `::display-probe::`, then note which numbers drew.

## Caveat

Under `--include-partial-messages`, which the VS Code extension passes, the
original text streams in first and the replacement lands when the message
completes.
