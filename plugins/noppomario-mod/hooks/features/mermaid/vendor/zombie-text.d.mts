/** Declarations for the bundle scripts/build-renderers.mjs writes. */

export type AsciiRenderOptions = {
  colorMode?: 'none' | 'auto' | 'ansi'
  useAscii?: boolean
  boxBorderPadding?: number
  paddingX?: number
  paddingY?: number
}

export declare function renderMermaidASCII(text: string, options?: AsciiRenderOptions): string
