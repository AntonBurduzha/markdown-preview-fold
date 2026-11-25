import { describe, expect, it } from 'vitest';
import {
  buildOutline,
  descendants,
  isHiddenBy,
  selfAndAncestors,
  type Block,
  type Section,
} from '../../src/preview/sections';

const h = (level: number, text: string): Block => ({ kind: 'heading', level, text });
const p: Block = { kind: 'content' };

const keys = (sections: readonly Section[]) => sections.map((section) => section.key);

function section(blocks: readonly Block[], key: string): Section {
  const found = buildOutline(blocks).byKey.get(key);
  if (!found) throw new Error(`No section ${key}`);
  return found;
}

describe('buildOutline', () => {
  it('builds keys from the heading path', () => {
    const outline = buildOutline([h(1, 'Guide'), h(2, 'Setup'), h(3, 'Install'), h(2, 'Usage')]);
    expect(keys(outline.sections)).toEqual([
      'Guide#0',
      'Guide#0 › Setup#0',
      'Guide#0 › Setup#0 › Install#0',
      'Guide#0 › Usage#0',
    ]);
  });

  it('normalizes whitespace in heading text', () => {
    const outline = buildOutline([h(1, '  Getting \n started ')]);
    expect(keys(outline.sections)).toEqual(['Getting started#0']);
  });

  it('nests a skipped level under the nearest higher heading', () => {
    const outline = buildOutline([h(1, 'Top'), h(3, 'Deep'), p]);
    expect(keys(outline.sections)).toEqual(['Top#0', 'Top#0 › Deep#0']);
    expect(outline.sections[1]?.parent?.key).toBe('Top#0');
  });

  it('keeps keys when content inside a section changes', () => {
    const before = buildOutline([h(1, 'Guide'), p, h(2, 'Setup'), p, h(2, 'Usage')]);
    const after = buildOutline([h(1, 'Guide'), p, p, p, h(2, 'Setup'), h(2, 'Usage'), p]);
    expect(keys(after.sections)).toEqual(keys(before.sections));
  });

  it('numbers repeated headings under the same parent', () => {
    const outline = buildOutline([h(2, 'Notes'), p, h(2, 'Notes'), p]);
    expect(keys(outline.sections)).toEqual(['Notes#0', 'Notes#1']);
  });

  it('numbers repeats per parent, so the same title elsewhere starts at 0', () => {
    const outline = buildOutline([h(1, 'A'), h(2, 'Example'), p, h(1, 'B'), h(2, 'Example'), p]);
    expect(keys(outline.sections)).toEqual(['A#0', 'A#0 › Example#0', 'B#0', 'B#0 › Example#0']);
  });

  it('assigns each block to its innermost section', () => {
    const outline = buildOutline([p, h(1, 'A'), p, h(2, 'B'), p, p]);
    expect(outline.owners.map((owner) => owner?.key)).toEqual([
      undefined,
      undefined,
      'A#0',
      'A#0',
      'A#0 › B#0',
      'A#0 › B#0',
    ]);
  });

  it('marks sections with content or subsections as foldable', () => {
    const outline = buildOutline([h(1, 'Parent'), h(2, 'Empty'), h(2, 'Child'), p]);
    expect(outline.sections.map((s) => s.hasBody)).toEqual([true, false, true]);
  });

  it('indexes sections by key', () => {
    const outline = buildOutline([h(1, 'Guide'), h(2, 'Setup'), p]);
    const setup = outline.byKey.get('Guide#0 › Setup#0');
    expect(setup).toBe(outline.sections[1]);
    expect(setup?.blockIndex).toBe(1);
    expect(outline.byKey.size).toBe(2);
  });
});

describe('outline helpers', () => {
  const blocks = [h(1, 'A'), h(2, 'B'), h(3, 'C'), p, h(2, 'D'), p];

  it('lists descendants depth-first', () => {
    expect(keys(descendants(section(blocks, 'A#0')))).toEqual([
      'A#0 › B#0',
      'A#0 › B#0 › C#0',
      'A#0 › D#0',
    ]);
  });

  it('lists a section and its ancestors', () => {
    expect(keys(selfAndAncestors(section(blocks, 'A#0 › B#0 › C#0')))).toEqual([
      'A#0 › B#0 › C#0',
      'A#0 › B#0',
      'A#0',
    ]);
  });

  it('hides a block when its section or any ancestor is collapsed', () => {
    const outline = buildOutline(blocks);
    const contentOfC = outline.owners[3];
    expect(isHiddenBy(contentOfC, new Set())).toBe(false);
    expect(isHiddenBy(contentOfC, new Set(['A#0 › B#0 › C#0']))).toBe(true);
    expect(isHiddenBy(contentOfC, new Set(['A#0']))).toBe(true);
    expect(isHiddenBy(contentOfC, new Set(['A#0 › D#0']))).toBe(false);
    expect(isHiddenBy(undefined, new Set(['A#0']))).toBe(false);
  });
});
