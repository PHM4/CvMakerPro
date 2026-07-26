import { useState } from 'react';
import type { Entry, EntrySection, ProseSection, Section, SkillSection } from '../model/document';
import { parseInline, serializeInline } from '../model/inline';
import {
  addBullet,
  addEntry,
  addSkillGroup,
  editBullet,
  editEntry,
  editProse,
  editSection,
  editSkillGroup,
  moveBullet,
  moveEntry,
  moveSection,
  removeBullet,
  removeEntry,
  removeSection,
  removeSkillGroup,
} from '../state/documentEdits';
import type { CvDocumentStore } from '../state/useCvDocument';
import { Button, Glyph, IconButton, TextAreaField, TextField } from '../ui/controls';

const INLINE_HINT = '**bold**, *italic*, `code`, [text](link)';

interface SectionEditorProps {
  store: CvDocumentStore;
  section: Section;
  index: number;
  total: number;
  /** Rendered next to each bullet. Absent when the assistant is unavailable. */
  renderBulletAssist?: (context: BulletContext) => React.ReactNode;
}

export interface BulletContext {
  sectionId: string;
  entry: Entry;
  index: number;
  text: string;
  replace: (text: string) => void;
}

export function SectionEditor({ store, section, index, total, renderBulletAssist }: SectionEditorProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { update } = store;

  return (
    <section className={`section-card${section.hidden ? ' is-hidden-section' : ''}`}>
      <div className="section-bar">
        <button
          type="button"
          className="section-toggle"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
        >
          <span className="section-index">{String(index + 1).padStart(2, '0')}</span>
          <input
            className="section-heading-input"
            value={section.heading}
            onChange={(event) =>
              update((document) => editSection(document, section.id, { heading: event.target.value }), `heading:${section.id}`)
            }
            onClick={(event) => event.stopPropagation()}
            aria-label="Section heading"
          />
        </button>

        <div className="section-actions">
          <IconButton
            label={section.hidden ? 'Show on the CV' : 'Hide from the CV, keeping the content'}
            onClick={() => update((document) => editSection(document, section.id, { hidden: !section.hidden }))}
          >
            <Glyph.Eye open={!section.hidden} />
          </IconButton>
          <IconButton
            label="Move section up"
            disabled={index === 0}
            onClick={() => update((document) => moveSection(document, section.id, -1))}
          >
            <Glyph.Up />
          </IconButton>
          <IconButton
            label="Move section down"
            disabled={index === total - 1}
            onClick={() => update((document) => moveSection(document, section.id, 1))}
          >
            <Glyph.Down />
          </IconButton>
          <IconButton
            label="Delete section"
            onClick={() => update((document) => removeSection(document, section.id))}
          >
            <Glyph.Cross />
          </IconButton>
        </div>
      </div>

      {collapsed ? null : (
        <div className="section-body">
          {section.kind === 'entries' ? (
            <EntryList store={store} section={section} renderBulletAssist={renderBulletAssist} />
          ) : null}
          {section.kind === 'skills' ? <SkillList store={store} section={section} /> : null}
          {section.kind === 'prose' ? <ProseBody store={store} section={section} /> : null}
        </div>
      )}
    </section>
  );
}

function EntryList({
  store,
  section,
  renderBulletAssist,
}: {
  store: CvDocumentStore;
  section: EntrySection;
  renderBulletAssist?: (context: BulletContext) => React.ReactNode;
}) {
  const { update } = store;

  return (
    <>
      {section.entries.map((entry, entryIndex) => (
        <article className="entry" key={entry.id}>
          <div className="entry-head">
            <span className="entry-ordinal">{entryIndex + 1}</span>
            <div className="entry-head-actions">
              <IconButton
                label="Move entry up"
                disabled={entryIndex === 0}
                onClick={() => update((document) => moveEntry(document, section.id, entry.id, -1))}
              >
                <Glyph.Up />
              </IconButton>
              <IconButton
                label="Move entry down"
                disabled={entryIndex === section.entries.length - 1}
                onClick={() => update((document) => moveEntry(document, section.id, entry.id, 1))}
              >
                <Glyph.Down />
              </IconButton>
              <IconButton
                label="Delete entry"
                onClick={() => update((document) => removeEntry(document, section.id, entry.id))}
              >
                <Glyph.Cross />
              </IconButton>
            </div>
          </div>

          <div className="field-row">
            <TextField
              label="Title"
              value={entry.title}
              placeholder="Senior Backend Engineer"
              onChange={(value) =>
                update((document) => editEntry(document, section.id, entry.id, { title: value }), `title:${entry.id}`)
              }
            />
            <TextField
              label="Organisation"
              value={entry.organisation ?? ''}
              placeholder="Northgate Payments"
              onChange={(value) =>
                update(
                  (document) => editEntry(document, section.id, entry.id, { organisation: value || undefined }),
                  `org:${entry.id}`,
                )
              }
            />
          </div>

          <div className="field-row">
            <TextField
              label="Location"
              value={entry.location ?? ''}
              placeholder="Manchester"
              onChange={(value) =>
                update(
                  (document) => editEntry(document, section.id, entry.id, { location: value || undefined }),
                  `loc:${entry.id}`,
                )
              }
            />
            <DateRangeFields store={store} sectionId={section.id} entry={entry} />
          </div>

          <div className="bullets">
            <span className="field-label">Bullets</span>
            {entry.bullets.map((bullet, bulletIndex) => {
              const text = serializeInline(bullet);
              const replace = (value: string) =>
                update(
                  (document) => editBullet(document, section.id, entry.id, bulletIndex, parseInline(value)),
                  `bullet:${entry.id}:${bulletIndex}`,
                );

              return (
                <div className="bullet-row" key={bulletIndex}>
                  <textarea
                    className="control control-area bullet-input"
                    value={text}
                    rows={2}
                    placeholder="What changed because you were there?"
                    onChange={(event) => replace(event.target.value)}
                    aria-label={`Bullet ${bulletIndex + 1}`}
                  />
                  <div className="bullet-actions">
                    {renderBulletAssist?.({ sectionId: section.id, entry, index: bulletIndex, text, replace })}
                    <IconButton
                      label="Move bullet up"
                      disabled={bulletIndex === 0}
                      onClick={() => update((document) => moveBullet(document, section.id, entry.id, bulletIndex, -1))}
                    >
                      <Glyph.Up />
                    </IconButton>
                    <IconButton
                      label="Move bullet down"
                      disabled={bulletIndex === entry.bullets.length - 1}
                      onClick={() => update((document) => moveBullet(document, section.id, entry.id, bulletIndex, 1))}
                    >
                      <Glyph.Down />
                    </IconButton>
                    <IconButton
                      label="Delete bullet"
                      onClick={() => update((document) => removeBullet(document, section.id, entry.id, bulletIndex))}
                    >
                      <Glyph.Cross />
                    </IconButton>
                  </div>
                </div>
              );
            })}
            <p className="field-hint">{INLINE_HINT}</p>
            <Button onClick={() => update((document) => addBullet(document, section.id, entry.id))}>
              <Glyph.Plus /> Bullet
            </Button>
          </div>

          <TextField
            label="Tools"
            value={entry.tags.join(', ')}
            placeholder="C#, PostgreSQL, Kafka"
            hint="Comma separated."
            onChange={(value) =>
              update(
                (document) =>
                  editEntry(document, section.id, entry.id, {
                    tags: value
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  }),
                `tags:${entry.id}`,
              )
            }
          />
        </article>
      ))}

      <Button onClick={() => update((document) => addEntry(document, section.id))}>
        <Glyph.Plus /> Entry
      </Button>
    </>
  );
}

/**
 * Dates are two month inputs rather than a date picker. A picker insists on a day, and
 * the model does not store one — offering a control that captures more precision than
 * the document keeps is a promise the app cannot honour.
 */
function DateRangeFields({
  store,
  sectionId,
  entry,
}: {
  store: CvDocumentStore;
  sectionId: string;
  entry: Entry;
}) {
  const { update } = store;
  const start = entry.dates?.start;
  const end = entry.dates?.end;

  const setStart = (value: string) => {
    const parsed = parseMonthInput(value);
    update((document) =>
      editEntry(document, sectionId, entry.id, {
        dates: parsed ? { start: parsed, end: entry.dates?.end } : undefined,
      }),
    );
  };

  const setEnd = (value: string) => {
    const parsed = parseMonthInput(value);
    update((document) =>
      editEntry(document, sectionId, entry.id, {
        dates: entry.dates ? { start: entry.dates.start, end: parsed } : undefined,
      }),
    );
  };

  return (
    <div className="date-fields">
      <label className="field-label" htmlFor={`${entry.id}-start`}>
        Dates
      </label>
      <div className="date-inputs">
        <input
          id={`${entry.id}-start`}
          className="control"
          type="month"
          value={start ? toMonthInput(start.year, start.month) : ''}
          onChange={(event) => setStart(event.target.value)}
          aria-label="Start month"
        />
        <span className="date-dash">–</span>
        <input
          className="control"
          type="month"
          value={end ? toMonthInput(end.year, end.month) : ''}
          onChange={(event) => setEnd(event.target.value)}
          disabled={!entry.dates}
          aria-label="End month"
        />
      </div>
      <p className="field-hint">Leave the end blank for a role you are still in.</p>
    </div>
  );
}

function toMonthInput(year: number, month: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

function parseMonthInput(value: string): { year: number; month: number } | undefined {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return undefined;

  return { year: Number(match[1]), month: Number(match[2]) };
}

function SkillList({ store, section }: { store: CvDocumentStore; section: SkillSection }) {
  const { update } = store;

  return (
    <>
      {section.groups.map((group) => (
        <div className="skill-group" key={group.id}>
          <div className="field-row">
            <TextField
              label="Group"
              value={group.label ?? ''}
              placeholder="Languages"
              hint="Optional. Blank prints the skills as one run."
              onChange={(value) =>
                update((document) => editSkillGroup(document, section.id, group.id, { label: value || undefined }), `sg:${group.id}`)
              }
            />
            <IconButton
              label="Delete group"
              onClick={() => update((document) => removeSkillGroup(document, section.id, group.id))}
            >
              <Glyph.Cross />
            </IconButton>
          </div>
          <TextAreaField
            label="Skills"
            rows={2}
            value={group.skills.join(', ')}
            placeholder="C#, TypeScript, PostgreSQL"
            hint="Comma separated."
            onChange={(value) =>
              update(
                (document) =>
                  editSkillGroup(document, section.id, group.id, {
                    skills: value
                      .split(',')
                      .map((skill) => skill.trim())
                      .filter(Boolean),
                  }),
                `sk:${group.id}`,
              )
            }
          />
        </div>
      ))}

      <Button onClick={() => update((document) => addSkillGroup(document, section.id))}>
        <Glyph.Plus /> Group
      </Button>
    </>
  );
}

function ProseBody({ store, section }: { store: CvDocumentStore; section: ProseSection }) {
  const { update } = store;

  return (
    <TextAreaField
      label="Text"
      rows={5}
      value={serializeInline(section.body)}
      placeholder="Three sentences. What you do, what you are good at, what you are looking for."
      hint={INLINE_HINT}
      onChange={(value) => update((document) => editProse(document, section.id, parseInline(value)), `prose:${section.id}`)}
    />
  );
}
