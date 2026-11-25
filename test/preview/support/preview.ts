// A stand-in for the built-in Markdown preview page, for DOM tests in jsdom.
// It updates `.markdown-body` with morphdom and dispatches the same window event
// as the real preview (media/index.js in markdown-language-features).
import morphdom from 'morphdom';
import { CLASSES } from '../../../src/preview/dom';
import type { KeyValueStore } from '../../../src/preview/storage';

const UPDATE_EVENT = 'vscode.markdown.updateContent';
/** Attributes the preview ignores when it compares an element with its new version. */
const IGNORED_ATTRIBUTES = new Set(['open', 'data-line']);

/** Builds the page from scratch, like a new webview. */
export function loadPage(html: string): Element {
  document.body.innerHTML = `<div class="markdown-body">${html}</div>`;
  return root();
}

/**
 * A new webview before the preview's own script has run: the body has no content yet.
 * Then `addContent` does what that script does after DOMContentLoaded: it appends
 * `.markdown-body` and fires no update event.
 */
export function loadEmptyPage(): void {
  document.body.innerHTML = '';
}

export async function addContent(html: string): Promise<void> {
  const body = document.createElement('div');
  body.className = 'markdown-body';
  body.innerHTML = html;
  document.body.append(body);
  // MutationObserver callbacks run as microtasks; let them finish.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Patches the page with morphdom, like an edit in the editor, then fires the update event. */
export function updatePage(html: string): void {
  const current = root();
  const next = document.createElement('div');
  next.className = 'markdown-body';
  next.innerHTML = html;

  if (docOf(current) !== docOf(next)) {
    // Another document: the preview replaces the whole body.
    current.replaceWith(next);
  } else {
    morphdom(current, next, {
      childrenOnly: true,
      onBeforeElUpdated: (from, to) => !areNodesEqual(from, to),
    });
  }
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

export function root(): Element {
  const body = document.querySelector('.markdown-body');
  if (!body) throw new Error('No .markdown-body on the page');
  return body;
}

/** jsdom has no layout, so visibility is our hidden class on the element or an ancestor. */
export function isVisible(element: Element): boolean {
  return element.closest(`.${CLASSES.hidden}`) === null;
}

export function heading(text: string): HTMLElement {
  const found = Array.from(document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')).find(
    (el) => el.textContent.trim() === text,
  );
  if (!found) throw new Error(`No heading "${text}"`);
  return found;
}

export function caretOf(text: string): HTMLElement {
  const caret = heading(text).querySelector<HTMLElement>(`:scope > .${CLASSES.caret}`);
  if (!caret) throw new Error(`No caret on "${text}"`);
  return caret;
}

export function paragraph(text: string): HTMLElement {
  const found = Array.from(document.querySelectorAll<HTMLElement>('p')).find((el) =>
    el.textContent.includes(text),
  );
  if (!found) throw new Error(`No paragraph with "${text}"`);
  return found;
}

export function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

function docOf(body: Element): string | null {
  return body.querySelector(':scope > .mdfold-meta')?.getAttribute('data-doc') ?? null;
}

function areNodesEqual(a: Element, b: Element): boolean {
  if (a.tagName !== b.tagName) return false;
  const attributesOf = (el: Element) =>
    Array.from(el.attributes).filter((attr) => !IGNORED_ATTRIBUTES.has(attr.name));
  const aAttributes = attributesOf(a);
  if (aAttributes.length !== attributesOf(b).length) return false;
  if (aAttributes.some((attr) => b.getAttribute(attr.name) !== attr.value)) return false;
  if (a.childNodes.length !== b.childNodes.length) return false;
  return Array.from(a.childNodes).every((child, index) => {
    const other = b.childNodes[index];
    if (other?.nodeType !== child.nodeType) return false;
    if (child instanceof Element) return other instanceof Element && areNodesEqual(child, other);
    return child.textContent === other.textContent;
  });
}
