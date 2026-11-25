import { beforeEach, describe, expect, it } from 'vitest';
import { CLASSES, readView, renderView } from '../../src/preview/dom';
import { caretOf, heading, isVisible, loadPage, paragraph } from './support/preview';

const GUIDE = 'Guide#0';
const SETUP = 'Guide#0 › Setup#0';

const PAGE = `
<div class="mdfold-meta" hidden data-doc="file:///notes/a.md"></div>
<h1 class="code-line" data-line="0">Guide</h1>
<p class="code-line" data-line="2">Intro text.</p>
<h2 class="code-line" data-line="4">Setup</h2>
<ul class="code-line" data-line="6"><li class="code-line" data-line="6"><p>Install the tools.</p></li></ul>
<h2 class="code-line" data-line="8">Empty</h2>
`;

let root: Element;

beforeEach(() => {
  root = loadPage(PAGE);
});

describe('readView', () => {
  it('skips the marker and reads the outline', () => {
    const view = readView(root);
    expect(view.elements).toHaveLength(5);
    expect(view.elements.some((el) => el.classList.contains('mdfold-meta'))).toBe(false);
    expect(view.outline.sections.map((s) => s.key)).toEqual([GUIDE, SETUP, 'Guide#0 › Empty#0']);
  });
});

describe('renderView', () => {
  it('adds a caret to foldable headings only', () => {
    renderView(readView(root), new Set());
    expect(root.querySelectorAll(`.${CLASSES.caret}`)).toHaveLength(2);
    expect(caretOf('Guide').getAttribute('aria-expanded')).toBe('true');
    expect(caretOf('Setup').getAttribute('data-key')).toBe(SETUP);
    expect(heading('Empty').querySelector(`.${CLASSES.caret}`)).toBeNull();
  });

  it('hides the body of a collapsed section and marks its heading', () => {
    renderView(readView(root), new Set([SETUP]));
    expect(heading('Setup').classList.contains(CLASSES.collapsed)).toBe(true);
    expect(caretOf('Setup').getAttribute('aria-expanded')).toBe('false');
    expect(isVisible(paragraph('Install the tools.'))).toBe(false);
    expect(isVisible(heading('Setup'))).toBe(true);
    expect(isVisible(heading('Empty'))).toBe(true);
    expect(isVisible(paragraph('Intro text.'))).toBe(true);
  });

  it('is idempotent', () => {
    const view = readView(root);
    renderView(view, new Set([SETUP]));
    const once = root.innerHTML;
    renderView(view, new Set([SETUP]));
    expect(root.querySelectorAll(`.${CLASSES.caret}`)).toHaveLength(2);
    expect(root.innerHTML).toBe(once);
    // The caret adds no text, so the keys are the same on the next read.
    expect(readView(root).outline.sections.map((s) => s.key)).toEqual(
      view.outline.sections.map((s) => s.key),
    );
  });

  it('takes hidden lines out of scroll sync and puts them back', () => {
    const view = readView(root);
    const list = root.querySelector('ul');
    const item = root.querySelector('li');
    if (!list || !item) throw new Error('No list on the page');

    renderView(view, new Set([SETUP]));
    expect(list.classList.contains('code-line')).toBe(false);
    expect(item.classList.contains('code-line')).toBe(false);
    expect(heading('Setup').classList.contains('code-line')).toBe(true);

    renderView(view, new Set());
    expect(list.classList.contains('code-line')).toBe(true);
    expect(item.classList.contains('code-line')).toBe(true);
    expect(root.querySelector('[data-mdfold-line]')).toBeNull();
  });
});
