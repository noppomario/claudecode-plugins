/**
 * The Mermaid renderer scripts/extract-renderer.mjs carves out of the Claude
 * Code binary on this machine. The implementation is Anthropic's and is not
 * committed; this declaration is what the hooks module is typed against.
 */

/** What a source was recognised as, and the rows it drew into. */
export type Drawing = {
  kind: 'flowchart' | 'sequence diagram'
  lines: string[]
}

/** How a source fared, for whoever wants to count the outcomes. */
export type Outcome = 'drawn' | 'kept' | 'threw'

/**
 * Draws one Mermaid source.
 *
 * @param source the diagram's own text, without its fence
 * @param columns the width to lay out into
 * @param onThrow called when the parse or layout threw
 * @returns the drawing, or undefined when the source is not one this draws,
 *          does not parse, or does not fit the width
 */
export declare function renderMermaid(
  source: string,
  columns: number,
  onThrow?: () => void,
): Drawing | undefined

/**
 * Replaces every closed mermaid fence in a block of markdown with its
 * drawing, leaving the rest of the text alone.
 *
 * A fence that does not draw keeps its source, so the result is always
 * something worth showing.
 *
 * @param text the markdown to rewrite
 * @param columns the width to lay out into
 * @param record called once per fence with how it fared
 * @returns the rewritten markdown, or `text` itself when nothing was drawn
 */
export declare function withDiagrams(
  text: string,
  columns: number,
  record?: (outcome: Outcome) => void,
): string
