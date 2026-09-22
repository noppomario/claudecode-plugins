# claudecode-plugins

A Claude Code plugin marketplace. The plugins here are mods: their behaviour
lives in a hooks module that the engine loads as TypeScript and calls as
functions, rather than in commands or MCP servers.

The target surface is the VS Code extension panel, which the built-in mods do
not cover — the shipped `mermaid` mod, for one, registers `surface: "terminal"`.

## Plugins

| Plugin | What it does |
| --- | --- |
| [`ui-surface-probe`](plugins/ui-surface-probe) | Reports which `ui.render` surfaces a host raises, and whether it draws rewritten text and `Svg` elements. |

## Requirements

- Claude Code 2.1.270 or newer (function hooks). The VS Code extension bundles
  its own binary: check `resources/native-binary/claude --version`, not the
  `claude` on `PATH`.
- `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`. Without it the engine ignores the
  `modules` key in `hooks/hooks.json` and a mod loads as an inert plugin.

Set it in `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1"
  }
}
```

## Install

```sh
claude plugin marketplace add noppomario/claudecode-plugins
claude plugin install ui-surface-probe@noppo-claudecode-plugins
```

From a clone, for one session:

```sh
claude --plugin-dir plugins/ui-surface-probe
```

`--plugin-dir` is a CLI flag, so it is not available from the VS Code panel;
install through the marketplace to test there.

## Development

The type declarations a hooks module is written against are Anthropic's
copyrighted material and are not committed. Fetch them once:

```sh
./scripts/fetch-types.sh   # writes vendor/claude-code.d.ts
bunx tsc -p tsconfig.json
```

Edits under a plugin's `hooks/` hot-reload into a running `--plugin-dir`
session. The engine reports what it refused in the debug log (`claude --debug`,
or `/status`).

## License

MIT for the code in this repository. Nothing under `vendor/` is covered by it.
