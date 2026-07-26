import {
  isRichTextEmpty,
  visibleSections,
  type CvDocument,
  type Entry,
  type EntrySection,
  type ProseSection,
  type SkillSection,
} from '../model/document';
import { contactHref, contactLabel, formatDateRange } from '../model/format';
import { RichTextView } from './RichTextView';
import type { FlowBlock } from './types';

/**
 * The block structure every single-column template shares.
 *
 * All three templates emit exactly this DOM and differ only in their stylesheet — including
 * Marginal, which moves the dates into a left rail purely by changing the grid on the entry
 * header. That is the payoff for keeping layout out of the model: a new look is a CSS file, not
 * a new renderer with its own pagination bugs.
 *
 * `prefix` scopes the class names so two templates' stylesheets can coexist in one document.
 */
export function standardBlocks(document: CvDocument, prefix: string): FlowBlock[] {
  const blocks: FlowBlock[] = [masthead(document, prefix)];

  for (const section of visibleSections(document)) {
    blocks.push({
      key: `${section.id}:heading`,
      keepWithNext: true,
      spaceBeforeMm: 4.6,
      node: <h2 className={`${prefix}-heading`}>{section.heading}</h2>,
    });

    switch (section.kind) {
      case 'entries':
        blocks.push(...entryBlocks(section, prefix));
        break;
      case 'skills':
        blocks.push(...skillBlocks(section, prefix));
        break;
      case 'prose':
        blocks.push(proseBlock(section, prefix));
        break;
    }
  }

  return blocks;
}

function masthead(document: CvDocument, prefix: string): FlowBlock {
  const { header } = document;
  const contacts = header.contacts.filter((contact) => contact.value.trim() !== '');

  return {
    key: 'masthead',
    keepWithNext: true,
    node: (
      <header>
        <h1 className={`${prefix}-name`}>{header.fullName}</h1>
        {header.headline ? <p className={`${prefix}-headline`}>{header.headline}</p> : null}
        {contacts.length > 0 ? (
          <p className={`${prefix}-contacts`}>
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
        <div className={`${prefix}-masthead-rule`} />
      </header>
    ),
  };
}

function entryBlocks(section: EntrySection, prefix: string): FlowBlock[] {
  return section.entries.flatMap((entry, index) => oneEntry(section.id, entry, index === 0, prefix));
}

function oneEntry(sectionId: string, entry: Entry, isFirst: boolean, prefix: string): FlowBlock[] {
  const bullets = entry.bullets.filter((bullet) => !isRichTextEmpty(bullet));
  const blocks: FlowBlock[] = [];
  const meta = entry.dates ? formatDateRange(entry.dates) : undefined;

  blocks.push({
    key: `${sectionId}:${entry.id}:head`,
    // Keep the job title with whatever follows it. A title alone at the foot of a page reads as
    // a job the applicant is hiding the details of.
    keepWithNext: bullets.length > 0 || entry.tags.length > 0,
    spaceBeforeMm: isFirst ? 2.4 : 2.9,
    node: (
      <div className={`${prefix}-entry-head`}>
        <div>
          <span className={`${prefix}-entry-title`}>{entry.title}</span>
          {entry.organisation ? (
            <span className={`${prefix}-entry-org`}>{entry.organisation}</span>
          ) : null}
        </div>
        {meta || entry.location ? (
          <div className={`${prefix}-entry-meta`}>
            {meta}
            {entry.location ? <span className={`${prefix}-entry-place`}>{entry.location}</span> : null}
          </div>
        ) : null}
      </div>
    ),
  });

  bullets.forEach((bullet, index) => {
    blocks.push({
      key: `${sectionId}:${entry.id}:b${index}`,
      // The first bullet is what stops the entry header being an orphan, so it must not itself
      // become one: it stays with the bullet after it where there is one.
      keepWithNext: index === 0 && bullets.length > 1,
      spaceBeforeMm: index === 0 ? 1.1 : 0.7,
      node: (
        <p className={`${prefix}-bullet`}>
          <RichTextView value={bullet} />
        </p>
      ),
    });
  });

  if (entry.tags.length > 0) {
    blocks.push({
      key: `${sectionId}:${entry.id}:tags`,
      spaceBeforeMm: 1.1,
      node: (
        <p className={`${prefix}-tags`}>
          <span className={`${prefix}-tags-label`}>Tools: </span>
          {entry.tags.join(', ')}
        </p>
      ),
    });
  }

  return blocks;
}

function skillBlocks(section: SkillSection, prefix: string): FlowBlock[] {
  return section.groups
    .filter((group) => group.skills.length > 0)
    .map((group, index) => ({
      key: `${section.id}:${group.id}`,
      spaceBeforeMm: index === 0 ? 2.2 : 1.1,
      node: group.label ? (
        <div className={`${prefix}-skill-row`}>
          <span className={`${prefix}-skill-label`}>{group.label}</span>
          <span className={`${prefix}-skill-list`}>{group.skills.join(', ')}</span>
        </div>
      ) : (
        <p className={`${prefix}-skill-list`}>{group.skills.join(', ')}</p>
      ),
    }));
}

function proseBlock(section: ProseSection, prefix: string): FlowBlock {
  return {
    key: `${section.id}:body`,
    spaceBeforeMm: 2.2,
    node: (
      <p className={`${prefix}-prose`}>
        <RichTextView value={section.body} />
      </p>
    ),
  };
}
