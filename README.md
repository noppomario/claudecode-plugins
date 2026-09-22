# claudecode-plugins

A Claude Code plugin marketplace holding one plugin, `noppomario-mod`: a mod,
meaning its behaviour lives in a hooks module that the engine loads as
TypeScript and calls as functions, rather than in commands or MCP servers.

Features go in the one plugin rather than one plugin each, because a plugin is
the unit of install and because two plugins that rewrite the same render site
collide — see [docs/findings.md](docs/findings.md).

## What it does today

Draws the mermaid code fences in Claude's replies where they stand — as text
on the terminal, as ASCII in the VS Code panel, as SVG on a surface that
takes one — and tells the model to write fences rather than draw diagrams by
hand. See [plugins/noppomario-mod](plugins/noppomario-mod/README.md).

## Requirements

- Claude Code 2.1.270 or newer (function hooks). The VS Code extension bundles
  its own binary: check `resources/native-binary/claude --version`, not the
  `claude` on `PATH`.
- `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`. Without it the engine ignores the
  `modules` key in `hooks/hooks.json`; the `MessageDisplay` hook still works,
  so the VS Code panel is served either way.
- `node` on `PATH` (18 or newer). Two hooks run as ordinary Node processes.

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
claude plugin install noppomario-mod@noppo-claudecode-plugins
```

## Development

The type declarations a hooks module is written against are Anthropic's
copyrighted material and are not committed. Fetch them once:

```sh
./scripts/fetch-types.sh            # writes vendor/claude-code.d.ts
npm install                         # esbuild and the pinned renderer
node scripts/build-renderers.mjs    # rebuilds the committed bundles
bunx tsc -p tsconfig.json
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test plugins/noppomario-mod
```

Edits under `hooks/` hot-reload into a running `--plugin-dir` session. The
engine reports what it refused in the debug log (`claude --debug`).

## License

MIT for the code in this repository. `vendor/claude-code.d.ts` is Anthropic's
and is not committed; the bundles under `plugins/*/hooks/**/vendor/` are
[`zombie-mermaid`](https://github.com/dfadler/zombie-mermaid), MIT, under its
own copyright.
