import { A4, emptyRichText, type CvDocument } from './document';

/**
 * What you get on a first visit, and from "New CV".
 *
 * Structure but no content. The sections are laid out so the shape of a CV is obvious before
 * you have typed anything, and every field is empty — prefilled achievements belonging to
 * somebody else are the fastest way to make a tool feel like a template you have to clean up.
 *
 * Mirrors StarterDocument.cs, which does the same job for documents the server creates.
 */
export function starterDocument(): CvDocument {
  return {
    id: crypto.randomUUID(),
    title: 'Untitled CV',
    header: {
      fullName: '',
      contacts: [
        { id: newId(), kind: 'email', value: '' },
        { id: newId(), kind: 'phone', value: '' },
        { id: newId(), kind: 'location', value: '' },
      ],
    },
    sections: [
      { kind: 'prose', id: newId(), heading: 'Profile', hidden: false, body: emptyRichText },
      {
        kind: 'entries',
        id: newId(),
        heading: 'Experience',
        hidden: false,
        entries: [blankEntry()],
      },
      {
        kind: 'entries',
        id: newId(),
        heading: 'Education',
        hidden: false,
        entries: [blankEntry()],
      },
      {
        kind: 'skills',
        id: newId(),
        heading: 'Skills',
        hidden: false,
        groups: [{ id: newId(), skills: [] }],
      },
      { kind: 'entries', id: newId(), heading: 'Projects', hidden: false, entries: [] },
    ],
    theme: {
      templateId: 'sable',
      accentColor: '#16150f',
      fontFamily: 'Source Serif 4 Variable',
      fontScale: 1,
      density: 'normal',
      page: A4,
    },
    version: 1,
    updatedAt: new Date().toISOString(),
  };
}

function blankEntry() {
  return { id: newId(), title: '', bullets: [emptyRichText], tags: [] };
}

function newId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}
