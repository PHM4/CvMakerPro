import type { ContactKind } from '../model/document';
import { addContact, editContact, editHeader, removeContact } from '../state/documentEdits';
import type { CvDocumentStore } from '../state/useCvDocument';
import { Button, Glyph, IconButton, TextField } from '../ui/controls';

const CONTACT_LABELS: Record<ContactKind, string> = {
  email: 'Email',
  phone: 'Phone',
  location: 'Location',
  website: 'Website',
  linkedIn: 'LinkedIn',
  gitHub: 'GitHub',
  other: 'Other',
};

const CONTACT_PLACEHOLDERS: Record<ContactKind, string> = {
  email: 'you@example.com',
  phone: '+44 7700 900000',
  location: 'Manchester, UK',
  website: 'yoursite.dev',
  linkedIn: 'linkedin.com/in/you',
  gitHub: 'github.com/you',
  other: '',
};

export function HeaderEditor({ store }: { store: CvDocumentStore }) {
  const { document, update } = store;
  const { header } = document;

  const used = new Set(header.contacts.map((contact) => contact.kind));
  const available = (Object.keys(CONTACT_LABELS) as ContactKind[]).filter(
    (kind) => kind === 'other' || !used.has(kind),
  );

  return (
    <section className="section-card">
      <div className="section-bar">
        <div className="section-toggle is-static">
          <span className="section-index">00</span>
          <span className="section-heading-static">Heading</span>
        </div>
      </div>

      <div className="section-body">
        <TextField
          label="Name"
          value={header.fullName}
          placeholder="Rowan Whitaker"
          onChange={(value) => update((doc) => editHeader(doc, { fullName: value }), 'header:name')}
        />
        <TextField
          label="One-line summary"
          value={header.headline ?? ''}
          placeholder="Backend engineer — distributed systems, payments"
          hint="Optional. A job title and a specialism, not a sentence."
          onChange={(value) =>
            update((doc) => editHeader(doc, { headline: value || undefined }), 'header:headline')
          }
        />

        <div className="contacts">
          <span className="field-label">Contact</span>
          {header.contacts.map((contact) => (
            <div className="contact-row" key={contact.id}>
              <span className="contact-kind">{CONTACT_LABELS[contact.kind]}</span>
              <input
                className="control"
                value={contact.value}
                placeholder={CONTACT_PLACEHOLDERS[contact.kind]}
                aria-label={CONTACT_LABELS[contact.kind]}
                onChange={(event) =>
                  update((doc) => editContact(doc, contact.id, { value: event.target.value }), `contact:${contact.id}`)
                }
              />
              <IconButton
                label={`Remove ${CONTACT_LABELS[contact.kind]}`}
                onClick={() => update((doc) => removeContact(doc, contact.id))}
              >
                <Glyph.Cross />
              </IconButton>
            </div>
          ))}

          <div className="contact-add">
            {available.map((kind) => (
              <Button key={kind} variant="quiet" onClick={() => update((doc) => addContact(doc, kind))}>
                <Glyph.Plus /> {CONTACT_LABELS[kind]}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
