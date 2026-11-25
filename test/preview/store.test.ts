import { describe, expect, it } from 'vitest';
import { buildOutline, isHiddenBy, type Block, type Section } from '../../src/preview/sections';
import { foldReducer, type FoldState } from '../../src/preview/store';

const h = (level: number, text: string): Block => ({ kind: 'heading', level, text });
const p: Block = { kind: 'content' };

// Guide › Setup › (Install, Config), Usage, Empty
const outline = buildOutline([
  h(1, 'Guide'),
  p,
  h(2, 'Setup'),
  p,
  h(3, 'Install'),
  p,
  h(3, 'Config'),
  p,
  h(2, 'Usage'),
  p,
  h(2, 'Empty'),
]);

const GUIDE = 'Guide#0';
const SETUP = 'Guide#0 › Setup#0';
const INSTALL = 'Guide#0 › Setup#0 › Install#0';
const CONFIG = 'Guide#0 › Setup#0 › Config#0';
const USAGE = 'Guide#0 › Usage#0';
const EMPTY = 'Guide#0 › Empty#0';

function get(key: string): Section {
  const section = outline.byKey.get(key);
  if (!section) throw new Error(`No section ${key}`);
  return section;
}

const toggle = (state: FoldState, key: string, recursive = false) =>
  foldReducer(state, { type: 'toggle', section: get(key), recursive });

describe('foldReducer', () => {
  it('collapses and expands one section', () => {
    const collapsed = toggle(new Set(), SETUP);
    expect([...collapsed]).toEqual([SETUP]);
    expect([...toggle(collapsed, SETUP)]).toEqual([]);
  });

  it('keeps a collapsed child collapsed when its parent expands (requirement 1)', () => {
    let state = toggle(new Set(), INSTALL);
    state = toggle(state, SETUP);
    state = toggle(state, SETUP);
    expect(state.has(INSTALL)).toBe(true);
    // Install's content (block 5) is still hidden, Config's content (block 7) is not.
    expect(isHiddenBy(outline.owners[5], state)).toBe(true);
    expect(isHiddenBy(outline.owners[7], state)).toBe(false);
  });

  it('collapses a section with all its subsections on a recursive toggle', () => {
    const state = toggle(new Set(), SETUP, true);
    expect([...state].sort()).toEqual([SETUP, CONFIG, INSTALL].sort());
  });

  it('expands a section with all its subsections on a recursive toggle', () => {
    const state = toggle(new Set([GUIDE, SETUP, INSTALL]), SETUP, true);
    expect([...state]).toEqual([GUIDE]);
  });

  it('collapses only sections that have a body', () => {
    const state = foldReducer(new Set(), { type: 'collapseAll', sections: outline.sections });
    expect(state.has(EMPTY)).toBe(false);
    expect([...state].sort()).toEqual([GUIDE, SETUP, INSTALL, CONFIG, USAGE].sort());
  });

  it('expands everything', () => {
    const state = foldReducer(new Set([GUIDE, SETUP, USAGE]), { type: 'expandAll' });
    expect(state.size).toBe(0);
  });

  it('reveals a section by expanding it and its ancestors only', () => {
    const state = foldReducer(new Set([GUIDE, SETUP, INSTALL, USAGE]), {
      type: 'reveal',
      owner: get(SETUP),
    });
    expect([...state].sort()).toEqual([INSTALL, USAGE].sort());
  });

  it('never mutates the previous state', () => {
    const before: FoldState = new Set([GUIDE]);
    toggle(before, SETUP);
    toggle(before, GUIDE, true);
    foldReducer(before, { type: 'collapseAll', sections: outline.sections });
    foldReducer(before, { type: 'expandAll' });
    foldReducer(before, { type: 'reveal', owner: get(SETUP) });
    expect([...before]).toEqual([GUIDE]);
  });
});
