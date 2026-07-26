import { Fragment, type ReactNode } from 'react';
import type { RichText, TextRun } from '../model/document';

/**
 * Renders stored runs as semantic elements. Marks nest outwards in a fixed order so the
 * same run always produces the same markup — the export sanitiser works from an
 * allowlist, and a stable set of tags is what makes that allowlist small enough to trust.
 */
export function RichTextView({ value }: { value: RichText }) {
  return (
    <>
      {value.runs.map((run, index) => (
        <Fragment key={index}>{renderRun(run)}</Fragment>
      ))}
    </>
  );
}

function renderRun(run: TextRun): ReactNode {
  let node: ReactNode = run.text;

  if (run.marks.includes('code')) {
    node = <code>{node}</code>;
  }

  if (run.marks.includes('italic')) {
    node = <em>{node}</em>;
  }

  if (run.marks.includes('bold')) {
    node = <strong>{node}</strong>;
  }

  if (run.marks.includes('link') && run.href) {
    node = (
      <a href={run.href} rel="noreferrer">
        {node}
      </a>
    );
  }

  return node;
}
