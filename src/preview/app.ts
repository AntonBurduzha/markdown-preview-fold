// Wires the fold logic to the built-in Markdown preview page.
import { decodeCommand, META_CLASS, type FoldCommand } from '../shared/protocol';
import { blockIndexOf, CLASSES, readView, renderView, type PreviewView } from './dom';
import { isHiddenBy } from './sections';
import type { FoldStorage } from './storage';
import { foldReducer, type FoldEvent, type FoldState } from './store';

/** Starts folding in the current page. Returns a function that stops it. */
export function startPreviewFold(storage: FoldStorage): () => void {
  const seenCommands = new Set<string>();
  let doc: string | undefined;
  let state: FoldState = new Set();
  let view: PreviewView | undefined;

  // On a new page the preview's own script adds `.markdown-body` after DOMContentLoaded and
  // fires no update event. Its script and ours are both `async`, so either can run first.
  const waitForContent = new MutationObserver(() => {
    if (document.querySelector('.markdown-body')) update();
  });

  /** Runs once the content is on the page, and after every preview update. */
  function update(): void {
    const root = document.querySelector('.markdown-body');
    if (!root) return;
    waitForContent.disconnect();

    const meta = root.querySelector(`:scope > .${META_CLASS}`);
    const nextDoc = meta?.getAttribute('data-doc') ?? undefined;
    if (nextDoc !== doc) {
      doc = nextDoc;
      state = new Set(doc ? storage.load(doc) : []);
    }

    view = readView(root);

    // `markdown.preview.refresh` reloads the whole page, so a command usually arrives
    // on the first update. Later updates within the host's TTL carry the same id.
    const command = decodeCommand(meta?.getAttribute('data-cmd'));
    if (command && !seenCommands.has(command.id)) {
      seenCommands.add(command.id);
      state = commit(foldReducer(state, toEvent(command, view)));
    }

    renderView(view, state);
  }

  function dispatch(event: FoldEvent): void {
    if (!view) return;
    state = commit(foldReducer(state, event));
    renderView(view, state);
  }

  function commit(next: FoldState): FoldState {
    if (doc) storage.save(doc, next);
    return next;
  }

  function onClick(event: MouseEvent): void {
    if (!(event.target instanceof Element) || !view) return;

    const caret = event.target.closest(`.${CLASSES.caret}`);
    if (caret) {
      event.preventDefault();
      const section = view.outline.byKey.get(caret.getAttribute('data-key') ?? '');
      if (section) dispatch({ type: 'toggle', section, recursive: event.altKey });
      return;
    }

    // An in-page link into a collapsed section: expand it before the browser scrolls.
    const link = event.target.closest('a[href^="#"]');
    const target = link && findTarget(link.getAttribute('href') ?? '');
    const index = target ? blockIndexOf(view, target) : undefined;
    const owner = index === undefined ? undefined : view.outline.owners[index];
    if (owner && isHiddenBy(owner, state)) dispatch({ type: 'reveal', owner });
  }

  // The preview opens the editor on double-click. Two quick caret clicks shouldn't.
  function onDoubleClick(event: MouseEvent): void {
    if (event.target instanceof Element && event.target.closest(`.${CLASSES.caret}`)) {
      event.stopPropagation();
    }
  }

  window.addEventListener('vscode.markdown.updateContent', update);
  window.addEventListener('dblclick', onDoubleClick, true);
  document.addEventListener('click', onClick);

  // Observe first: if the content is already there, `update()` stops the observer at once.
  waitForContent.observe(document, { childList: true, subtree: true });
  update();

  return () => {
    waitForContent.disconnect();
    window.removeEventListener('vscode.markdown.updateContent', update);
    window.removeEventListener('dblclick', onDoubleClick, true);
    document.removeEventListener('click', onClick);
  };
}

function toEvent(command: FoldCommand, view: PreviewView): FoldEvent {
  return command.action === 'collapseAll'
    ? { type: 'collapseAll', sections: view.outline.sections }
    : { type: 'expandAll' };
}

function findTarget(href: string): Element | null {
  try {
    return document.getElementById(decodeURIComponent(href.slice(1)));
  } catch {
    return null;
  }
}
