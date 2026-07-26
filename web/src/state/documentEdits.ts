import {
  emptyRichText,
  type ContactItem,
  type ContactKind,
  type CvDocument,
  type Entry,
  type EntrySection,
  type Header,
  type ProseSection,
  type RichText,
  type Section,
  type SkillGroup,
  type SkillSection,
  type Theme,
} from '../model/document';

/**
 * Pure edits over a document.
 *
 * These are plain functions rather than a reducer with an action union because the
 * editor has roughly forty distinct edits and an action type per edit is a lot of
 * ceremony for `spread the object, replace one field`. The state hook wraps these for
 * undo; nothing here knows that undo exists.
 */

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

/* Header ------------------------------------------------------------------ */

export function editHeader(document: CvDocument, patch: Partial<Header>): CvDocument {
  return { ...document, header: { ...document.header, ...patch } };
}

export function editContact(
  document: CvDocument,
  contactId: string,
  patch: Partial<ContactItem>,
): CvDocument {
  return editHeader(document, {
    contacts: document.header.contacts.map((contact) =>
      contact.id === contactId ? { ...contact, ...patch } : contact,
    ),
  });
}

export function addContact(document: CvDocument, kind: ContactKind): CvDocument {
  return editHeader(document, {
    contacts: [...document.header.contacts, { id: newId(), kind, value: '' }],
  });
}

export function removeContact(document: CvDocument, contactId: string): CvDocument {
  return editHeader(document, {
    contacts: document.header.contacts.filter((contact) => contact.id !== contactId),
  });
}

/* Sections ---------------------------------------------------------------- */

function mapSections(
  document: CvDocument,
  sectionId: string,
  update: (section: Section) => Section,
): CvDocument {
  return {
    ...document,
    sections: document.sections.map((section) =>
      section.id === sectionId ? update(section) : section,
    ),
  };
}

export function editSection(
  document: CvDocument,
  sectionId: string,
  patch: { heading?: string; hidden?: boolean },
): CvDocument {
  return mapSections(document, sectionId, (section) => ({ ...section, ...patch }));
}

export function addSection(document: CvDocument, kind: Section['kind']): CvDocument {
  const base = { id: newId(), heading: defaultHeading(kind), hidden: false };

  const section: Section =
    kind === 'entries'
      ? { ...base, kind, entries: [blankEntry()] }
      : kind === 'skills'
        ? { ...base, kind, groups: [{ id: newId(), skills: [] }] }
        : { ...base, kind, body: emptyRichText };

  return { ...document, sections: [...document.sections, section] };
}

export function removeSection(document: CvDocument, sectionId: string): CvDocument {
  return { ...document, sections: document.sections.filter((section) => section.id !== sectionId) };
}

export function moveSection(document: CvDocument, sectionId: string, delta: number): CvDocument {
  return { ...document, sections: moveById(document.sections, sectionId, delta) };
}

function defaultHeading(kind: Section['kind']): string {
  switch (kind) {
    case 'entries':
      return 'Experience';
    case 'skills':
      return 'Skills';
    case 'prose':
      return 'Profile';
  }
}

/* Entries ----------------------------------------------------------------- */

function mapEntrySection(
  document: CvDocument,
  sectionId: string,
  update: (section: EntrySection) => EntrySection,
): CvDocument {
  return mapSections(document, sectionId, (section) =>
    section.kind === 'entries' ? update(section) : section,
  );
}

export function blankEntry(): Entry {
  return { id: newId(), title: '', bullets: [emptyRichText], tags: [] };
}

export function editEntry(
  document: CvDocument,
  sectionId: string,
  entryId: string,
  patch: Partial<Entry>,
): CvDocument {
  return mapEntrySection(document, sectionId, (section) => ({
    ...section,
    entries: section.entries.map((entry) =>
      entry.id === entryId ? { ...entry, ...patch } : entry,
    ),
  }));
}

export function addEntry(document: CvDocument, sectionId: string): CvDocument {
  return mapEntrySection(document, sectionId, (section) => ({
    ...section,
    entries: [...section.entries, blankEntry()],
  }));
}

export function removeEntry(document: CvDocument, sectionId: string, entryId: string): CvDocument {
  return mapEntrySection(document, sectionId, (section) => ({
    ...section,
    entries: section.entries.filter((entry) => entry.id !== entryId),
  }));
}

export function moveEntry(
  document: CvDocument,
  sectionId: string,
  entryId: string,
  delta: number,
): CvDocument {
  return mapEntrySection(document, sectionId, (section) => ({
    ...section,
    entries: moveById(section.entries, entryId, delta),
  }));
}

/* Bullets ----------------------------------------------------------------- */

export function editBullet(
  document: CvDocument,
  sectionId: string,
  entryId: string,
  index: number,
  value: RichText,
): CvDocument {
  return mapEntrySection(document, sectionId, (section) => ({
    ...section,
    entries: section.entries.map((entry) =>
      entry.id === entryId
        ? { ...entry, bullets: entry.bullets.map((bullet, i) => (i === index ? value : bullet)) }
        : entry,
    ),
  }));
}

export function addBullet(document: CvDocument, sectionId: string, entryId: string): CvDocument {
  return mapEntrySection(document, sectionId, (section) => ({
    ...section,
    entries: section.entries.map((entry) =>
      entry.id === entryId ? { ...entry, bullets: [...entry.bullets, emptyRichText] } : entry,
    ),
  }));
}

export function removeBullet(
  document: CvDocument,
  sectionId: string,
  entryId: string,
  index: number,
): CvDocument {
  return mapEntrySection(document, sectionId, (section) => ({
    ...section,
    entries: section.entries.map((entry) =>
      entry.id === entryId
        ? { ...entry, bullets: entry.bullets.filter((_, i) => i !== index) }
        : entry,
    ),
  }));
}

export function moveBullet(
  document: CvDocument,
  sectionId: string,
  entryId: string,
  index: number,
  delta: number,
): CvDocument {
  return mapEntrySection(document, sectionId, (section) => ({
    ...section,
    entries: section.entries.map((entry) =>
      entry.id === entryId ? { ...entry, bullets: moveAt(entry.bullets, index, delta) } : entry,
    ),
  }));
}

/* Skills ------------------------------------------------------------------ */

function mapSkillSection(
  document: CvDocument,
  sectionId: string,
  update: (section: SkillSection) => SkillSection,
): CvDocument {
  return mapSections(document, sectionId, (section) =>
    section.kind === 'skills' ? update(section) : section,
  );
}

export function editSkillGroup(
  document: CvDocument,
  sectionId: string,
  groupId: string,
  patch: Partial<SkillGroup>,
): CvDocument {
  return mapSkillSection(document, sectionId, (section) => ({
    ...section,
    groups: section.groups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)),
  }));
}

export function addSkillGroup(document: CvDocument, sectionId: string): CvDocument {
  return mapSkillSection(document, sectionId, (section) => ({
    ...section,
    groups: [...section.groups, { id: newId(), label: '', skills: [] }],
  }));
}

export function removeSkillGroup(
  document: CvDocument,
  sectionId: string,
  groupId: string,
): CvDocument {
  return mapSkillSection(document, sectionId, (section) => ({
    ...section,
    groups: section.groups.filter((group) => group.id !== groupId),
  }));
}

/* Prose ------------------------------------------------------------------- */

export function editProse(document: CvDocument, sectionId: string, body: RichText): CvDocument {
  return mapSections(document, sectionId, (section) =>
    section.kind === 'prose' ? ({ ...section, body } satisfies ProseSection) : section,
  );
}

/* Theme ------------------------------------------------------------------- */

export function editTheme(document: CvDocument, patch: Partial<Theme>): CvDocument {
  return { ...document, theme: { ...document.theme, ...patch } };
}

/* Ordering ---------------------------------------------------------------- */

function moveById<T extends { id: string }>(items: T[], id: string, delta: number): T[] {
  return moveAt(items, items.findIndex((item) => item.id === id), delta);
}

/** Out-of-range moves are a no-op — the caller is a button that should simply be inert. */
function moveAt<T>(items: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (index < 0 || target < 0 || target >= items.length) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}
