// Fold state as a set of collapsed section keys, changed only through a reducer.
import { descendants, selfAndAncestors, type Section } from './sections';

export type FoldState = ReadonlySet<string>;

export type FoldEvent =
  /** A caret click. `recursive` (Alt/Option+click) applies the same change to every subsection. */
  | { readonly type: 'toggle'; readonly section: Section; readonly recursive: boolean }
  | { readonly type: 'collapseAll'; readonly sections: readonly Section[] }
  | { readonly type: 'expandAll' }
  /** Expands `owner` and its ancestors, so a link target becomes visible. */
  | { readonly type: 'reveal'; readonly owner: Section };

export function foldReducer(state: FoldState, event: FoldEvent): FoldState {
  switch (event.type) {
    case 'toggle': {
      const collapse = !state.has(event.section.key);
      const targets = event.recursive
        ? [event.section, ...descendants(event.section)]
        : [event.section];
      return withKeys(state, foldableKeys(targets), collapse);
    }
    case 'collapseAll':
      return new Set(foldableKeys(event.sections));
    case 'expandAll':
      return new Set();
    case 'reveal':
      return withKeys(state, foldableKeys(selfAndAncestors(event.owner)), false);
  }
}

function foldableKeys(sections: readonly Section[]): string[] {
  return sections.filter((section) => section.hasBody).map((section) => section.key);
}

function withKeys(state: FoldState, keys: readonly string[], collapsed: boolean): FoldState {
  const next = new Set(state);
  for (const key of keys) {
    if (collapsed) next.add(key);
    else next.delete(key);
  }
  return next;
}
