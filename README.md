# claudecode-plugins

A Claude Code plugin marketplace holding one plugin,
[`noppomario-mod`](plugins/noppomario-mod/README.md): a mod, meaning its
behaviour lives in a hooks module the engine loads as TypeScript and calls as
functions.

It draws the mermaid code fences in Claude's replies where they stand, and
tells the model to write fences rather than draw diagrams by hand.

Features go in the one plugin rather than one plugin each: a plugin is the
unit of install, and two plugins that rewrite the same render site collide.
[docs/findings.md](docs/findings.md) has that and the rest of what this cost
to learn.

## Requirements

- Claude Code 2.1.270 or newer. The VS Code extension bundles its own binary:
  check `resources/native-binary/claude --version`, not the `claude` on `PATH`.
- `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1` in `~/.claude/settings.json` under
  `env`. Without it the `modules` key in `hooks/hooks.json` is ignored and
  only the `MessageDisplay` hook runs, which still serves the VS Code panel.
- `node` on `PATH` (18 or newer), for the VS Code panel and for SVG.

## Install

```sh
claude plugin marketplace add noppomario/claudecode-plugins
claude plugin install noppomario-mod@noppo-claudecode-plugins
```

## Development

```sh
npm ci --ignore-scripts
/plugin-types             # in a session; writes .claude/types/, not committed
npm run renderers         # rebuilds the committed renderer bundles
npm run check
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test plugins/noppomario-mod
```

Edits under `hooks/` hot-reload into a running `--plugin-dir` session. The
engine reports what it refused in the debug log (`claude --debug`).

## License

MIT, except the bundles under `plugins/*/hooks/**/vendor/`, which carry
`zombie-mermaid` and its dependencies under MIT, BSD-2-Clause and EPL-2.0.
The `*.LICENSE.md` beside each bundle lists them in full.
