import type { RichText, TextMark, TextRun } from './document';

/**
 * A very small inline syntax for the editor: **bold**, *italic*, `code`, and
 * [label](url).
 *
 * The stored model is runs, not markup, so something has to turn a text field into runs.
 * A full rich-text editor is the usual answer and it is the wrong one here — it brings a
 * schema, a selection model, and paste sanitising, to let people bold three words. This
 * parses on the way in and prints on the way out, so the field a user types into is
 * exactly what they get back when they reopen the document.
 */

const PATTERN = /(\*\*|__)(.+?)\1|(\*|_)(.+?)\3|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(text: string): RichText {
  const runs: TextRun[] = [];
  let cursor = 0;

  for (const match of text.matchAll(PATTERN)) {
    const start = match.index;
    if (start > cursor) {
      runs.push({ text: text.slice(cursor, start), marks: [] });
    }

    const [, , boldText, , italicText, codeText, linkLabel, linkHref] = match;

    if (boldText !== undefined) {
      runs.push({ text: boldText, marks: ['bold'] });
    } else if (italicText !== undefined) {
      runs.push({ text: italicText, marks: ['italic'] });
    } else if (codeText !== undefined) {
      runs.push({ text: codeText, marks: ['code'] });
    } else if (linkLabel !== undefined && linkHref !== undefined) {
      runs.push({ text: linkLabel, marks: ['link'], href: normaliseHref(linkHref) });
    }

    cursor = start + match[0].length;
  }

  if (cursor < text.length) {
    runs.push({ text: text.slice(cursor), marks: [] });
  }

  return { runs };
}

export function serializeInline(value: RichText): string {
  return value.runs.map(printRun).join('');
}

function printRun(run: TextRun): string {
  if (run.marks.includes('link') && run.href) {
    return `[${run.text}](${run.href})`;
  }

  if (run.marks.includes('code')) {
    return `\`${run.text}\``;
  }

  // Bold wins when both are set: the parser cannot express nesting, so printing
  // ***text*** would not read back as the same thing.
  if (run.marks.includes('bold')) {
    return `**${run.text}**`;
  }

  if (run.marks.includes('italic')) {
    return `*${run.text}*`;
  }

  return run.text;
}

/**
 * Only http(s) and mailto survive. A link is the one place a document carries a URL
 * that later gets rendered into an anchor, and javascript: belongs nowhere near it.
 */
function normaliseHref(href: string): string | undefined {
  const trimmed = href.trim();

  if (/^(https?:|mailto:)/i.test(trimmed)) {
    return trimmed;
  }

  if (/^[\w.-]+@[\w.-]+\.\w+$/.test(trimmed)) {
    return `mailto:${trimmed}`;
  }

  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return undefined;
}

export const inlineMarks: TextMark[] = ['bold', 'italic', 'code', 'link'];
