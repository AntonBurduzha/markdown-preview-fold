import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { markerPlugin } from '../../src/markdownIt/marker';

// VS Code passes a vscode.Uri; the plugin only needs its string form.
const uri = (value: string) => ({ toString: () => value });

function engine(getCommand: () => string | undefined = () => undefined): MarkdownIt {
  return new MarkdownIt().use(markerPlugin, { getCommand });
}

describe('markerPlugin', () => {
  it('puts the document marker before the content', () => {
    const md = engine();
    const html = md.render('# Title', { currentDocument: uri('file:///notes/a.md') });
    expect(html).toBe(
      '<div class="mdfold-meta" hidden data-doc="file:///notes/a.md"></div>\n<h1>Title</h1>\n',
    );
  });

  it('adds the pending command', () => {
    const md = engine(() => 'collapseAll:42');
    const html = md.render('# Title', { currentDocument: uri('file:///notes/a.md') });
    expect(html).toContain(
      '<div class="mdfold-meta" hidden data-doc="file:///notes/a.md" data-cmd="collapseAll:42"></div>',
    );
  });

  it('reads the command on every render, not once per parse', () => {
    let command: string | undefined = undefined;
    const md = engine(() => command);
    const env = { currentDocument: uri('file:///notes/a.md') };
    // Like VS Code: parse once with an empty env, render the cached tokens many times.
    const tokens = md.parse('# Title', {});

    expect(md.renderer.render(tokens, md.options, env)).not.toContain('data-cmd');
    command = 'expandAll:1';
    expect(md.renderer.render(tokens, md.options, env)).toContain('data-cmd="expandAll:1"');
  });

  it('escapes the document URI', () => {
    const html = engine().render('# Title', { currentDocument: uri('file:///a"b<c>.md') });
    expect(html).toContain('data-doc="file:///a&quot;b&lt;c&gt;.md"');
  });

  it('adds nothing when there is no document, as for plain string renders', () => {
    expect(engine(() => 'collapseAll:1').render('# Title')).toBe('<h1>Title</h1>\n');
  });
});
