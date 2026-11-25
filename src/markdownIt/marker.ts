import type { MarkdownIt } from 'markdown-it';
import { META_CLASS } from '../shared/protocol';

export interface MarkerOptions {
  /** The encoded command to deliver with this render, if there is one. */
  readonly getCommand: () => string | undefined;
}

interface RenderEnv {
  readonly currentDocument?: { toString(): string };
}

// VS Code caches the parsed tokens per document version and passes
// `currentDocument` only to `renderer.render`, so the marker is added there.
// A core rule would see neither the document nor a new command.
export function markerPlugin(md: MarkdownIt, options: MarkerOptions): void {
  const render = md.renderer.render.bind(md.renderer);
  md.renderer.render = (tokens, renderOptions, env) => {
    const html = render(tokens, renderOptions, env);
    // markdown-it types `env` loosely; VS Code puts `currentDocument` on it.
    const doc = (env as RenderEnv | undefined)?.currentDocument;
    if (!doc) return html;
    return markerHtml(md, doc.toString(), options.getCommand()) + html;
  };
}

function markerHtml(md: MarkdownIt, doc: string, command: string | undefined): string {
  const escape = md.utils.escapeHtml;
  const cmd = command ? ` data-cmd="${escape(command)}"` : '';
  return `<div class="${META_CLASS}" hidden data-doc="${escape(doc)}"${cmd}></div>\n`;
}
