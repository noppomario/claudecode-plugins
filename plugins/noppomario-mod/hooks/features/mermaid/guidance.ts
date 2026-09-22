import type { On } from 'claude-code'

/** The name the guidance renders under in the conversation's context. */
const BLOCK = 'mermaidDiagrams'

/**
 * What the model is told, once, at the top of a conversation.
 *
 * Drawing a diagram out of characters means laying it out in two dimensions
 * and counting display columns, and a model counts characters: a label of
 * Japanese or any other wide script takes two columns each and the box comes
 * out crooked. A mermaid fence hands that arithmetic to this plugin, which
 * measures every grapheme before it places anything.
 */
const GUIDANCE = `Diagrams in your replies are drawn for you. A \`\`\`mermaid fence is laid out and
drawn on screen for the person, by a plugin, after you
write it. The person sees the drawing; the fence itself is what you wrote.

So when a reply calls for a diagram - a flow, a sequence, a state machine, a shape of
a system - write it as a \`\`\`mermaid fence and let it be drawn. flowchart (graph),
sequenceDiagram, stateDiagram, classDiagram and erDiagram all draw; another kind, or
one that does not parse, shows its source instead, which is no worse than a fence.

Do not draw a diagram yourself out of box-drawing or ASCII characters. Laying one out
means counting display columns rather than characters, and a label in a wide script
takes two columns per character, so a hand-drawn box comes out crooked. Prose, lists
and tables are unaffected: this is about diagrams alone.`

/**
 * Adds the guidance to the conversation's first message.
 *
 * Unconditionally: every session draws now. A terminal and a surface with
 * `Svg` draw through `ui.render`, and one that draws nowhere is covered by
 * the MessageDisplay fallback.
 *
 * @param on the engine's registrar
 */
export function register(on: On) {
	on('prompt.context', ($, e, next) =>
		next({ ...e, blocks: [...e.blocks, { name: BLOCK, text: GUIDANCE }] }),
	)
}
