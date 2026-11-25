// Turns the preview's top-level blocks into an outline of foldable sections.
// Pure functions only: no DOM here, so the rules are easy to test.

export type Block =
  | { readonly kind: 'heading'; readonly level: number; readonly text: string }
  | { readonly kind: 'content' };

export interface Section {
  /** Survives edits: the parent's key, the heading text, and its index among same-text siblings. */
  readonly key: string;
  readonly level: number;
  /** Index of the heading in the block list. */
  readonly blockIndex: number;
  readonly parent: Section | undefined;
  readonly children: readonly Section[];
  /** True when there is something to fold: content or subsections. */
  readonly hasBody: boolean;
}

export interface Outline {
  /** Every section, in document order. */
  readonly sections: readonly Section[];
  /** For each block, the innermost section that contains it. A heading belongs to its parent. */
  readonly owners: readonly (Section | undefined)[];
  readonly byKey: ReadonlyMap<string, Section>;
}

interface MutableSection extends Section {
  readonly parent: MutableSection | undefined;
  readonly children: MutableSection[];
  hasBody: boolean;
}

const SEPARATOR = ' › ';

export function buildOutline(blocks: readonly Block[]): Outline {
  const sections: MutableSection[] = [];
  const owners: (MutableSection | undefined)[] = [];
  const byKey = new Map<string, MutableSection>();
  const open: MutableSection[] = [];
  const occurrences = new Map<string, number>();

  blocks.forEach((block, blockIndex) => {
    if (block.kind === 'content') {
      const owner = open.at(-1);
      if (owner) owner.hasBody = true;
      owners.push(owner);
      return;
    }

    // Close the sections this heading ends: the same level or deeper.
    let parent = open.at(-1);
    while (parent && parent.level >= block.level) {
      open.pop();
      parent = open.at(-1);
    }

    const path = parent
      ? `${parent.key}${SEPARATOR}${normalize(block.text)}`
      : normalize(block.text);
    const occurrence = occurrences.get(path) ?? 0;
    occurrences.set(path, occurrence + 1);

    const section: MutableSection = {
      key: `${path}#${String(occurrence)}`,
      level: block.level,
      blockIndex,
      parent,
      children: [],
      hasBody: false,
    };
    if (parent) {
      parent.children.push(section);
      parent.hasBody = true;
    }
    owners.push(parent);
    sections.push(section);
    byKey.set(section.key, section);
    open.push(section);
  });

  return { sections, owners, byKey };
}

/** A block is hidden when its own section or any ancestor is collapsed. */
export function isHiddenBy(owner: Section | undefined, collapsed: ReadonlySet<string>): boolean {
  for (let section = owner; section; section = section.parent) {
    if (collapsed.has(section.key)) return true;
  }
  return false;
}

export function descendants(section: Section): Section[] {
  return section.children.flatMap((child) => [child, ...descendants(child)]);
}

/** The section itself and every section above it. */
export function selfAndAncestors(section: Section): Section[] {
  const chain: Section[] = [];
  for (let current: Section | undefined = section; current; current = current.parent) {
    chain.push(current);
  }
  return chain;
}

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
