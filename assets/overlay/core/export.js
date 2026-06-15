// Export the session as a structured brief (EXP-1..EXP-7). PURE: state in, text out.
// Human-readable markdown (EXP-2) in document order (EXP-4), only current un-reverted
// state (EXP-6, guaranteed because reverted slots are null in the model).
import { orderedEntries } from './model.js';
import { labelFor, nounFor } from './label.js';

const KIND_ORDER = ['edit', 'comment', 'remove'];

const KIND_LABEL = {
  edit: 'Edit text',
  comment: 'Comment',
  remove: 'Remove',
};

/**
 * Flatten state into a numbered, document-ordered item list. Each annotation kind on an
 * element becomes its own item; multiple kinds on one element stay adjacent (EXP-3).
 */
export function exportItems(state) {
  const items = [];
  for (const entry of orderedEntries(state)) {
    for (const kind of KIND_ORDER) {
      if (!entry[kind]) continue;
      items.push({
        kind,
        anchor: entry.anchor,
        orphaned: !!entry.orphaned,
        payload: entry[kind],
      });
    }
  }
  return items;
}

function intentLines(item) {
  switch (item.kind) {
    case 'comment':
      return [`- comment: ${item.payload.text}`];
    case 'edit':
      return [
        '- change: replace the text',
        `  - from: "${item.payload.original}"`,
        `  - to:   "${item.payload.next}"`,
      ];
    case 'remove':
      return ['- request: remove this element.'];
    default:
      return [];
  }
}

function snippetLine(anchor) {
  const s = anchor.snippet || '';
  // The snippet helper already prefixes media with `alt: "…"`; keep that as-is.
  if (s.startsWith('alt:')) return `- text: ${s}`;
  return `- text: "${s}"`;
}

/**
 * @param {object} state
 * @param {{pageUrl?:string, pageTitle?:string}} [meta]
 * @returns {string} markdown brief
 */
export function toMarkdown(state, { pageUrl = '', pageTitle = '' } = {}) {
  const items = exportItems(state);
  const titlePart = pageTitle ? `"${pageTitle}"` : 'this page';
  const where = pageUrl ? ` (${pageUrl})` : '';

  const lines = [
    `# Review notes for ${titlePart}${where}`,
    '',
    'These are review notes on the page above, in top-to-bottom order.',
    'Apply each change to the source. For every item you have the element’s',
    'tag, a text snippet, a CSS-style selector, and a stable id to locate it.',
    '',
    '---',
  ];

  if (items.length === 0) {
    lines.push('', '_No annotations yet._', '');
    return lines.join('\n');
  }

  items.forEach((item, i) => {
    const noun = nounFor(item.anchor.tag);
    const warn = item.orphaned ? '  ⚠ could not be re-located on this load' : '';
    lines.push('');
    lines.push(`## ${i + 1}. ${KIND_LABEL[item.kind]} — ${noun}${warn}`);
    lines.push(`- anchor: \`${item.anchor.id}\``);
    lines.push(`- tag: \`${item.anchor.tag}\``);
    lines.push(`- selector: \`${item.anchor.selector}\``);
    lines.push(snippetLine(item.anchor));
    lines.push(...intentLines(item));
  });
  lines.push('');
  return lines.join('\n');
}

/** Optional raw JSON export for programmatic use (EXP-7). */
export function toJSON(state, meta = {}) {
  return JSON.stringify(
    {
      page: { url: meta.pageUrl || '', title: meta.pageTitle || '' },
      items: exportItems(state).map((it) => ({
        kind: it.kind,
        orphaned: it.orphaned,
        anchor: it.anchor,
        intent: it.payload,
      })),
    },
    null,
    2
  );
}

export { labelFor };
