# ui-surface-probe

A diagnostic mod. It answers three questions about a host before anything is
built on top of them:

1. Which `ui.render` surface does this host raise — `terminal`, `desktop`,
   `mobile` or `vscode`?
2. Does the host draw a rewritten `AssistantMessage`, or only the original?
3. Does it draw an `Svg` element returned by a hook?

The third matters because the element tables differ by surface: `terminal`
carries `Raster` and `Image`, while `desktop`, `mobile` and `vscode` carry
`Svg`. A mod that wants to draw a real diagram in the VS Code panel needs
`Svg` to work there.

## What it does

Every `AssistantMessage` it is allowed to rewrite gets a marker line naming
the surface that raised it:

```text
[ui-surface-probe] vscode
```

Each render also writes a line to the debug log with the request id and the
block's length.

When a reply contains `::probe-svg::` and the surface is `vscode`, the hook
returns an `Svg` element in place of the whole block, instead of rewriting its
text.

## Reading the result

| What you see | What it means |
| --- | --- |
| No marker anywhere | The mod did not load, or function hooks are off. |
| Marker naming a surface | That surface is raised and rewrites are drawn. |
| Debug lines but no marker | The hook runs; the host draws the original. |
| A blue box for `::probe-svg::` | `Svg` is drawn on this surface. |
| The reply's text for `::probe-svg::` | The element was refused; the debug log says why. |

## Uninstall

It marks every reply, so it is not meant to stay installed.

```sh
claude plugin uninstall ui-surface-probe@noppo-claudecode-plugins
```
