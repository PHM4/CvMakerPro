import {
  isRichTextEmpty,
  visibleSections,
  type CvDocument,
  type Entry,
  type EntrySection,
  type ProseSection,
  type SkillSection,
} from '../../model/document';
import { contactHref, contactLabel, formatDateRange } from '../../model/format';
import { RichTextView } from '../RichTextView';
import type { FlowBlock, TemplateDefinition } from '../types';
// Raw, not a Vite-processed stylesheet: this exact text is also shipped to the render
// service, and a preview styled by one pipeline and printed by another is a guess.
import sableCss from './sable.css?raw';

function buildBlocks(document: CvDocument): FlowBlock[] {
  const blocks: FlowBlock[] = [masthead(document)];

  for (const section of visibleSections(document)) {
    blocks.push({
      key: `${section.id}:heading`,
      keepWithNext: true,
      spaceBeforeMm: 4.6,
      node: <h2 className="sable-heading">{section.heading}</h2>,
    });

    switch (section.kind) {
      case 'entries':
        blocks.push(...entryBlocks(section));
        break;
      case 'skills':
        blocks.push(...skillBlocks(section));
        break;
      case 'prose':
        blocks.push(proseBlock(section));
        break;
    }
  }

  return blocks;
}

function masthead(document: CvDocument): FlowBlock {
  const { header } = document;
  const contacts = header.contacts.filter((contact) => contact.value.trim() !== '');

  return {
    key: 'masthead',
    keepWithNext: true,
    node: (
      <header>
        <h1 className="sable-name">{header.fullName}</h1>
        {header.headline ? <p className="sable-headline">{header.headline}</p> : null}
        {contacts.length > 0 ? (
          <p className="sable-contacts">
            {contacts.map((contact) => {
              const href = contactHref(contact);
              const label = contactLabel(contact);
              return (
                <span key={contact.id}>
                  {href ? (
                    <a href={href} rel="noreferrer">
                      {label}
                    </a>
                  ) : (
                    label
                  )}
                </span>
              );
            })}
          </p>
        ) : null}
        <div className="sable-masthead-rule" />
      </header>
    ),
  };
}

function entryBlocks(section: EntrySection): FlowBlock[] {
  return section.entries.flatMap((entry, index) => oneEntry(section.id, entry, index === 0));
}

function oneEntry(sectionId: string, entry: Entry, isFirst: boolean): FlowBlock[] {
  const bullets = entry.bullets.filter((bullet) => !isRichTextEmpty(bullet));
  const blocks: FlowBlock[] = [];

  const meta = entry.dates ? formatDateRange(entry.dates) : undefined;

  blocks.push({
    key: `${sectionId}:${entry.id}:head`,
    // Keep the job title with whatever follows it. A title alone at the foot of a page
    // reads as a job the applicant is hiding the details of.
    keepWithNext: bullets.length > 0 || entry.tags.length > 0,
    spaceBeforeMm: isFirst ? 2.4 : 2.9,
    node: (
      <div className="sable-entry-head">
        <div>
          <span className="sable-entry-title">{entry.title}</span>
          {entry.organisation ? (
            <span className="sable-entry-org">{entry.organisation}</span>
          ) : null}
        </div>
        {meta || entry.location ? (
          <div className="sable-entry-meta">
            {meta}
            {entry.location ? <span className="sable-entry-place">{entry.location}</span> : null}
          </div>
        ) : null}
      </div>
    ),
  });

  bullets.forEach((bullet, index) => {
    blocks.push({
      key: `${sectionId}:${entry.id}:b${index}`,
      // The first bullet is what stops the entry header being an orphan, so it must not
      // itself become one: it stays with the bullet after it where there is one.
      keepWithNext: index === 0 && bullets.length > 1,
      spaceBeforeMm: index === 0 ? 1.1 : 0.7,
      node: <p className="sable-bullet">{<RichTextView value={bullet} />}</p>,
    });
  });

  if (entry.tags.length > 0) {
    blocks.push({
      key: `${sectionId}:${entry.id}:tags`,
      spaceBeforeMm: 1.1,
      node: (
        <p className="sable-tags">
          <span className="sable-tags-label">Tools: </span>
          {entry.tags.join(', ')}
        </p>
      ),
    });
  }

  return blocks;
}

function skillBlocks(section: SkillSection): FlowBlock[] {
  return section.groups
    .filter((group) => group.skills.length > 0)
    .map((group, index) => ({
      key: `${section.id}:${group.id}`,
      spaceBeforeMm: index === 0 ? 2.2 : 1.1,
      node: group.label ? (
        <div className="sable-skill-row">
          <span className="sable-skill-label">{group.label}</span>
          <span className="sable-skill-list">{group.skills.join(', ')}</span>
        </div>
      ) : (
        <p className="sable-skill-list">{group.skills.join(', ')}</p>
      ),
    }));
}

function proseBlock(section: ProseSection): FlowBlock {
  return {
    key: `${section.id}:body`,
    spaceBeforeMm: 2.2,
    node: (
      <p className="sable-prose">
        <RichTextView value={section.body} />
      </p>
    ),
  };
}

export const sable: TemplateDefinition = {
  id: 'sable',
  name: 'Sable',
  description: 'One column, serif, dated right. The layout most hiring managers expect.',
  css: sableCss,
  buildBlocks,
};
