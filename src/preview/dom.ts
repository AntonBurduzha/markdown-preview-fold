// Reads the preview DOM into an outline and writes the fold state back.
// `renderView` is idempotent: the preview's morphdom update removes everything
// we add, so it runs again after every update.
import { META_CLASS } from '../shared/protocol';
import { buildOutline, isHiddenBy, type Block, type Outline, type Section } from './sections';

export const CLASSES = {
  caret: 'mdfold-caret',
  hidden: 'mdfold-hidden',
  foldable: 'mdfold-foldable',
  collapsed: 'mdfold-collapsed',
} as const;

/** The class the preview's scroll sync uses to map source lines to elements. */
const LINE_CLASS = 'code-line';
/** Marks elements we took out of scroll sync, so we can put them back. */
const LINE_MARK = 'data-mdfold-line';

const HEADING_TAG = /^H([1-6])$/;
const SVG_NS = 'http://www.w3.org/2000/svg';

export interface PreviewView {
  /** The top-level blocks of the preview, in order. */
  readonly elements: readonly Element[];
  readonly outline: Outline;
}

export function readView(root: Element): PreviewView {
  const elements = Array.from(root.children).filter((el) => !el.classList.contains(META_CLASS));
  return { elements, outline: buildOutline(elements.map(toBlock)) };
}

export function renderView(view: PreviewView, collapsed: ReadonlySet<string>): void {
  view.elements.forEach((element, index) => {
    setHidden(element, isHiddenBy(view.outline.owners[index], collapsed));
  });
  for (const section of view.outline.sections) {
    const heading = view.elements[section.blockIndex];
    if (heading) renderHeading(heading, section, collapsed.has(section.key));
  }
}

/** The top-level block that contains `element`, or undefined if it's outside the view. */
export function blockIndexOf(view: PreviewView, element: Element): number | undefined {
  for (let current: Element | null = element; current; current = current.parentElement) {
    const index = view.elements.indexOf(current);
    if (index !== -1) return index;
  }
  return undefined;
}

function toBlock(element: Element): Block {
  const match = HEADING_TAG.exec(element.tagName);
  if (!match) return { kind: 'content' };
  return { kind: 'heading', level: Number(match[1]), text: element.textContent };
}

function setHidden(element: Element, hidden: boolean): void {
  element.classList.toggle(CLASSES.hidden, hidden);
  // A hidden element has an empty bounding box, which confuses scroll sync.
  // Take it out of the line map while it's hidden.
  if (hidden) {
    for (const line of withSelf(element, `.${LINE_CLASS}`)) {
      line.classList.remove(LINE_CLASS);
      line.setAttribute(LINE_MARK, '');
    }
  } else {
    for (const line of withSelf(element, `[${LINE_MARK}]`)) {
      line.classList.add(LINE_CLASS);
      line.removeAttribute(LINE_MARK);
    }
  }
}

function withSelf(element: Element, selector: string): Element[] {
  const matches = Array.from(element.querySelectorAll(selector));
  return element.matches(selector) ? [element, ...matches] : matches;
}

function renderHeading(heading: Element, section: Section, isCollapsed: boolean): void {
  heading.classList.toggle(CLASSES.foldable, section.hasBody);
  heading.classList.toggle(CLASSES.collapsed, section.hasBody && isCollapsed);

  let caret = heading.querySelector(`:scope > .${CLASSES.caret}`);
  if (!section.hasBody) {
    caret?.remove();
    return;
  }
  if (!caret) {
    caret = createCaret(heading.ownerDocument);
    heading.prepend(caret);
  }
  caret.setAttribute('data-key', section.key);
  caret.setAttribute('aria-expanded', String(!isCollapsed));
  caret.setAttribute('aria-label', isCollapsed ? 'Expand section' : 'Collapse section');
  caret.setAttribute('title', caretTitle(isCollapsed));
}

function createCaret(doc: Document): Element {
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = CLASSES.caret;
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  // A sane size even before preview.css applies.
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('aria-hidden', 'true');
  const path = doc.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M4 6l4 4 4-4');
  svg.append(path);
  button.append(svg);
  return button;
}

function caretTitle(isCollapsed: boolean): string {
  const modifier = navigator.userAgent.includes('Mac') ? 'Option' : 'Alt';
  const action = isCollapsed ? 'Expand' : 'Collapse';
  return `${action} (${modifier}+click: with all subsections)`;
}
