import type { On } from 'claude-code'

/** Written into a reply to ask the `vscode` branch for an `Svg` element. */
const SVG_TOKEN = '::probe-svg::'

/** A shape with no script and no external reference, safe to hand a surface. */
const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80">
  <rect x="1" y="1" width="238" height="78" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
  <text x="120" y="46" font-family="sans-serif" font-size="20" fill="#e2e8f0" text-anchor="middle">Svg drawn by a mod</text>
</svg>`

const tag = (text: string) => `[ui-surface-probe] ${text}`

/**
 * @param surface the surface that raised the render
 * @param text the block's own markdown
 * @returns the block with the probe's marker on its first line
 */
const marked = (surface: string, text: string) => `\`${tag(surface)}\`\n\n${text}`

/**
 * Registers the probe.
 *
 * A host raises `ui.render` only for the surface it draws on, so a hook
 * registered for a surface this session never draws on simply never runs:
 * registering every surface is how the probe learns which one this host is.
 * Each hook prefixes the block with its surface, which shows in the transcript
 * and so needs no log to read.
 *
 * The `vscode` hook additionally answers {@link SVG_TOKEN} with an `Svg`
 * element, the one thing the terminal's element table does not carry.
 *
 * The matcher takes one surface literal per call, so the four registrations
 * stay written out rather than looped.
 *
 * @param on the engine's registrar
 */
export function register(on: On) {
  on('session.start', ($, e, next) => {
    $.ui.log(
      tag(`session.start surface=${String(e.surface)} interactive=${e.isInteractive}`),
      { to: 'debug' },
    )
    return next(e)
  })

  on('ui.render', { component: 'AssistantMessage', surface: 'terminal' }, ($, e, next) => {
    $.ui.log(tag(`ui.render terminal request=${e.requestId} chars=${e.props.text.length}`), {
      to: 'debug',
    })
    return next({ ...e, props: { ...e.props, text: marked('terminal', e.props.text) } })
  })

  on('ui.render', { component: 'AssistantMessage', surface: 'desktop' }, ($, e, next) => {
    $.ui.log(tag(`ui.render desktop request=${e.requestId} chars=${e.props.text.length}`), {
      to: 'debug',
    })
    return next({ ...e, props: { ...e.props, text: marked('desktop', e.props.text) } })
  })

  on('ui.render', { component: 'AssistantMessage', surface: 'mobile' }, ($, e, next) => {
    $.ui.log(tag(`ui.render mobile request=${e.requestId} chars=${e.props.text.length}`), {
      to: 'debug',
    })
    return next({ ...e, props: { ...e.props, text: marked('mobile', e.props.text) } })
  })

  on('ui.render', { component: 'AssistantMessage', surface: 'vscode' }, ($, e, next) => {
    $.ui.log(tag(`ui.render vscode request=${e.requestId} chars=${e.props.text.length}`), {
      to: 'debug',
    })

    if (e.props.text.includes(SVG_TOKEN)) {
      const { Svg } = $.ui.resolve(e)
      return Svg({ source: SAMPLE_SVG, alt: 'A rounded box reading "Svg drawn by a mod"' })
    }

    return next({ ...e, props: { ...e.props, text: marked('vscode', e.props.text) } })
  })
}
