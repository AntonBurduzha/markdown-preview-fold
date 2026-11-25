import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startPreviewFold } from '../../src/preview/app';
import { createStorage, type FoldStorage } from '../../src/preview/storage';
import {
  addContent,
  caretOf,
  heading,
  isVisible,
  loadEmptyPage,
  loadPage,
  memoryStore,
  paragraph,
  updatePage,
} from './support/preview';

const A = 'file:///notes/a.md';
const B = 'file:///notes/b.md';

function page({
  doc = A,
  cmd,
  extra = '',
  setupText = 'Setup text.',
}: { doc?: string; cmd?: string; extra?: string; setupText?: string } = {}): string {
  const command = cmd ? ` data-cmd="${cmd}"` : '';
  return `
<div class="mdfold-meta" hidden data-doc="${doc}"${command}></div>
<h1 id="guide">Guide</h1>
<p>Intro text.</p>${extra}
<h2 id="setup">Setup</h2>
<p>${setupText}</p>
<h3 id="install">Install</h3>
<p>Install text.</p>
<h2 id="usage">Usage</h2>
<p>See <a href="#install">Install</a> for the tools.</p>
`;
}

let storage: FoldStorage;
let stop: (() => void) | undefined;

function start(): void {
  stop = startPreviewFold(storage);
}

function click(element: Element, init: MouseEventInit = {}): void {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
}

beforeEach(() => {
  storage = createStorage(memoryStore());
  loadPage(page());
  start();
});

afterEach(() => {
  stop?.();
  stop = undefined;
});

describe('caret clicks', () => {
  it('collapses and expands a section', () => {
    click(caretOf('Setup'));
    expect(isVisible(paragraph('Setup text.'))).toBe(false);
    expect(isVisible(heading('Install'))).toBe(false);
    expect(isVisible(heading('Usage'))).toBe(true);

    click(caretOf('Setup'));
    expect(isVisible(paragraph('Setup text.'))).toBe(true);
    expect(isVisible(heading('Install'))).toBe(true);
  });

  it('keeps a collapsed subsection collapsed when the parent expands (requirement 1)', () => {
    click(caretOf('Install'));
    click(caretOf('Setup'));
    click(caretOf('Setup'));
    expect(isVisible(heading('Install'))).toBe(true);
    expect(isVisible(paragraph('Install text.'))).toBe(false);
  });

  it('collapses all subsections on Alt+click', () => {
    click(caretOf('Setup'), { altKey: true });
    click(caretOf('Setup'));
    expect(isVisible(paragraph('Setup text.'))).toBe(true);
    expect(isVisible(heading('Install'))).toBe(true);
    expect(isVisible(paragraph('Install text.'))).toBe(false);
  });

  it('only reacts to the caret, not to the heading', () => {
    click(heading('Setup'));
    expect(isVisible(paragraph('Setup text.'))).toBe(true);
  });

  it('stops a double-click on the caret from reaching the preview', () => {
    let reached = false;
    const listener = () => {
      reached = true;
    };
    document.addEventListener('dblclick', listener);
    try {
      caretOf('Setup').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      expect(reached).toBe(false);
      paragraph('Setup text.').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      expect(reached).toBe(true);
    } finally {
      document.removeEventListener('dblclick', listener);
    }
  });
});

describe('preview updates (requirement 2)', () => {
  it('keeps the state when text inside a collapsed section changes', () => {
    click(caretOf('Setup'));
    updatePage(page({ setupText: 'Setup text, edited.' }));
    expect(isVisible(paragraph('Setup text, edited.'))).toBe(false);
    expect(isVisible(heading('Usage'))).toBe(true);
  });

  it('keeps the state when a paragraph is added above', () => {
    click(caretOf('Setup'));
    updatePage(page({ extra: '\n<p>A new paragraph.</p>' }));
    expect(isVisible(paragraph('A new paragraph.'))).toBe(true);
    expect(isVisible(paragraph('Setup text.'))).toBe(false);
  });

  it('restores the state in a new webview', () => {
    click(caretOf('Setup'));
    stop?.();
    loadPage(page());
    start();
    expect(isVisible(paragraph('Setup text.'))).toBe(false);
  });

  // Switching back to the preview's tab: the preview's script may add the content after ours runs.
  it('restores the state when the content arrives after the script starts', async () => {
    click(caretOf('Setup'));
    stop?.();
    loadEmptyPage();
    start();
    await addContent(page());
    expect(caretOf('Setup').getAttribute('aria-expanded')).toBe('false');
    expect(isVisible(paragraph('Setup text.'))).toBe(false);
  });

  it('stops waiting for the content when stopped', async () => {
    stop?.();
    loadEmptyPage();
    start();
    stop?.();
    stop = undefined;
    await addContent(page());
    expect(() => caretOf('Setup')).toThrow('No caret');
  });

  it('keeps a separate state per document', () => {
    click(caretOf('Setup'));
    updatePage(page({ doc: B }));
    expect(isVisible(paragraph('Setup text.'))).toBe(true);
    updatePage(page({ doc: A }));
    expect(isVisible(paragraph('Setup text.'))).toBe(false);
  });
});

describe('bulk commands', () => {
  it('collapses everything and expands everything', () => {
    updatePage(page({ cmd: 'collapseAll:1' }));
    expect(isVisible(heading('Guide'))).toBe(true);
    expect(isVisible(paragraph('Intro text.'))).toBe(false);
    expect(isVisible(heading('Setup'))).toBe(false);

    updatePage(page({ cmd: 'expandAll:2' }));
    expect(isVisible(paragraph('Intro text.'))).toBe(true);
    expect(isVisible(paragraph('Install text.'))).toBe(true);
  });

  it('applies each command once', () => {
    updatePage(page({ cmd: 'collapseAll:1' }));
    click(caretOf('Guide'));
    updatePage(page({ cmd: 'collapseAll:1' }));
    expect(isVisible(paragraph('Intro text.'))).toBe(true);
  });

  // `markdown.preview.refresh` sets the webview's HTML, so the command comes with a new page.
  it('applies a command that arrives with a page reload', () => {
    stop?.();
    loadPage(page({ cmd: 'collapseAll:1' }));
    start();
    expect(isVisible(paragraph('Intro text.'))).toBe(false);
    click(caretOf('Guide'));
    updatePage(page({ cmd: 'collapseAll:1' }));
    expect(isVisible(paragraph('Intro text.'))).toBe(true);
  });

  it('applies a command when the reloaded page gets its content late', async () => {
    stop?.();
    loadEmptyPage();
    start();
    await addContent(page({ cmd: 'collapseAll:1' }));
    expect(isVisible(paragraph('Intro text.'))).toBe(false);
  });
});

describe('links', () => {
  it('expands the sections hiding a link target', () => {
    click(caretOf('Install'));
    click(caretOf('Setup'));
    const link = document.querySelector('a[href="#install"]');
    if (!link) throw new Error('No link to #install');
    click(link);
    expect(isVisible(heading('Install'))).toBe(true);
    expect(isVisible(paragraph('Install text.'))).toBe(false);
  });
});
