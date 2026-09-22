import type { On } from 'claude-code'

/** Written into a reply to ask for an `Svg` element in place of the block. */
const SVG_TOKEN = '::probe-svg::'

/** A shape with no script and no external reference, safe to hand a surface. */
const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80">
  <rect x="1" y="1" width="238" height="78" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
  <text x="120" y="46" font-family="sans-serif" font-size="20" fill="#e2e8f0" text-anchor="middle">Svg drawn by a mod</text>
</svg>`

const tag = (text: string) => `[ui-surface-probe] ${text}`

/**
 * Registers the probe.
 *
 * `session.start` writes one line to the transcript, so a session says
 * whether the module loaded at all without a `--debug` run to read. The
 * render hook then matches `AssistantMessage` on every surface rather than
 * one at a time: an unnarrowed matcher runs wherever the host raises the
 * component, and `e.surface` reports which surface that was. Registering a
 * surface the host never draws on would look the same as a host that never
 * raises the event, which is the confusion this avoids.
 *
 * @param on the engine's registrar
 */
export function register(on: On) {
  on('session.start', ($, e, next) => {
    $.ui.log(tag(`loaded · session.start surface=${String(e.surface)} interactive=${e.isInteractive}`))
    return next(e)
  })

  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => {
    $.ui.log(tag(`ui.render surface=${e.surface} request=${e.requestId}`), { to: 'debug' })

    if (e.surface === 'vscode' && e.props.text.includes(SVG_TOKEN)) {
      const { Svg } = $.ui.resolve(e)
      return Svg({ source: SAMPLE_SVG, alt: 'A rounded box reading "Svg drawn by a mod"' })
    }

    const text = `\`${tag(e.surface)}\`\n\n${e.props.text}`
    return next({ ...e, props: { ...e.props, text } })
  })
}
