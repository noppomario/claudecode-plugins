import type { On } from 'claude-code'

const BLOCK = 'mermaidDiagrams'

// Laying a diagram out means counting display columns, and a model counts
// characters: a label in a wide script is two columns per character and the
// box comes out crooked. A fence hands that arithmetic to the plugin.
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
 * Adds the guidance to the conversation's first message, unconditionally:
 * every session draws, one way or another.
 *
 * @param on the engine's registrar
 */
export function register(on: On) {
	on('prompt.context', ($, e, next) =>
		next({ ...e, blocks: [...e.blocks, { name: BLOCK, text: GUIDANCE }] }),
	)
}
