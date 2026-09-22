import type { On } from 'claude-code'

/** Written into a reply to ask for an `Svg` element in place of the block. */
const SVG_TOKEN = '::probe-svg::'

/**
 * Where the probe records what happened, relative to the session's directory.
 *
 * A drawing is only evidence to whoever is looking at the screen, and a
 * surface that declines to draw a line looks exactly like a module that never
 * loaded. A file separates the two: it is written whether or not anything is
 * drawn, and it can be read afterwards from another session.
 */
const JOURNAL = '.probe.log'

/** A shape with no script and no external reference, safe to hand a surface. */
const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80">
  <rect x="1" y="1" width="238" height="78" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
  <text x="120" y="46" font-family="sans-serif" font-size="20" fill="#e2e8f0" text-anchor="middle">Svg drawn by a mod</text>
</svg>`

const tag = (text: string) => `[ui-surface-probe] ${text}`

/**
 * Registers the probe.
 *
 * The render hook matches `AssistantMessage` on every surface rather than one
 * at a time: an unnarrowed matcher runs wherever the host raises the
 * component, and `e.surface` reports which surface that was.
 *
 * Each hook leaves three kinds of evidence, so a silent one narrows the cause
 * rather than only saying "nothing happened": a line in {@link JOURNAL}, a
 * line in the debug log, and something on screen.
 *
 * @param on the engine's registrar
 */
export function register(on: On) {
  let rendersSeen = 0

  on('session.start', async ($, e, next) => {
    const line = `session.start surface=${String(e.surface)} interactive=${e.isInteractive} cwd=${e.cwd}`
    const previous = await $.fs.read(JOURNAL).catch(() => '')
    await $.fs
      .write(JOURNAL, `${previous}${new Date().toISOString()} ${line}\n`)
      .catch(() => undefined)

    $.ui.log(tag(line), { to: 'debug' })
    $.ui.log(tag(`loaded · ${line}`))
    return next(e)
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    $.ui.log(tag(`ui.render surface=${e.surface} request=${e.requestId}`), { to: 'debug' })

    // One line a session: the surface is the finding, not the message count.
    if (rendersSeen === 0) {
      rendersSeen = 1
      const previous = await $.fs.read(JOURNAL).catch(() => '')
      await $.fs
        .write(JOURNAL, `${previous}${new Date().toISOString()} ui.render surface=${e.surface}\n`)
        .catch(() => undefined)
    }

    if (e.surface === 'vscode' && e.props.text.includes(SVG_TOKEN)) {
      const { Svg } = $.ui.resolve(e)
      return Svg({ source: SAMPLE_SVG, alt: 'A rounded box reading "Svg drawn by a mod"' })
    }

    const text = `\`${tag(e.surface)}\`\n\n${e.props.text}`
    return next({ ...e, props: { ...e.props, text } })
  })
}
