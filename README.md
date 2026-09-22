# claudecode-plugins

A Claude Code plugin marketplace holding one plugin, `noppomario-mod`: a mod,
meaning its behaviour lives in a hooks module the engine loads as TypeScript
and calls as functions.

Features go in the one plugin rather than one plugin each, because a plugin is
the unit of install and because two plugins that rewrite the same render site
collide — see [docs/findings.md](docs/findings.md).

## What it does today

Draws the mermaid code fences in Claude's replies where they stand, and tells
the model to write fences rather than draw diagrams by hand. See
[plugins/noppomario-mod](plugins/noppomario-mod/README.md).

## Requirements

- Claude Code 2.1.270 or newer. The VS Code extension bundles its own binary:
  check `resources/native-binary/claude --version`, not the `claude` on `PATH`.
- `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1` in `~/.claude/settings.json` under
  `env`. Without it the engine ignores the `modules` key in `hooks/hooks.json`;
  the `MessageDisplay` hook still works, so the VS Code panel is served either
  way.
- `node` on `PATH` (18 or newer). Two hooks run as ordinary Node processes.

## Install

```sh
claude plugin marketplace add noppomario/claudecode-plugins
claude plugin install noppomario-mod@noppo-claudecode-plugins
```

## Development

```sh
npm ci --ignore-scripts   # exactly the lockfile, and no install scripts run
/plugin-types             # in a session: writes .claude/types/, the API's
                          # declarations. Anthropic's, so not committed;
                          # write them again after Claude Code updates
npm run renderers         # rebuilds the committed renderer bundles
npm run check
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test plugins/noppomario-mod
```

`npm ci` rather than `npm install`: it installs the lockfile as it stands and
fails if `package.json` has drifted from it, where `install` would quietly
resolve something new. `--ignore-scripts` stops a dependency running code at
install time; esbuild's postinstall only checks the platform binary that its
optional dependency already carries, so it is not needed here.

Edits under `hooks/` hot-reload into a running `--plugin-dir` session. The
engine reports what it refused in the debug log (`claude --debug`).

## License

MIT, except the bundles under `plugins/*/hooks/**/vendor/`. Those carry
`zombie-mermaid` and its dependencies, each under its own licence — MIT,
BSD-2-Clause, and EPL-2.0 for `elkjs`. The `*.LICENSE.md` beside each bundle
lists them in full and is rebuilt with the bundle.

They are bundled rather than depended on because a hooks module may import
only its own files and Claude Code installs no dependencies for a plugin.
