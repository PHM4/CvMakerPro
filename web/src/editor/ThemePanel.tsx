import { A4, LETTER, type Density, type PageGeometry } from '../model/document';
import { editTheme } from '../state/documentEdits';
import type { CvDocumentStore } from '../state/useCvDocument';
import { templates } from '../templates/registry';
import { Field, SelectField } from '../ui/controls';

/**
 * Accent choices, not a colour picker.
 *
 * A free picker on a CV produces neon headings, and the person who chose them cannot see
 * why the CV is being rejected. These are five that print legibly in greyscale, which is
 * how a fair number of CVs are still read.
 */
const ACCENTS = [
  { value: '#16150f', label: 'Ink' },
  { value: '#7a2718', label: 'Oxblood' },
  { value: '#1f3d5c', label: 'Navy' },
  { value: '#2f4b3c', label: 'Pine' },
  { value: '#5b4a2f', label: 'Bronze' },
];

const FONTS = [
  { value: 'Source Serif 4 Variable', label: 'Source Serif — bookish, prints small well' },
  { value: 'Instrument Sans Variable', label: 'Instrument Sans — plainer, a little more modern' },
];

const DENSITIES: Array<{ value: Density; label: string }> = [
  { value: 'compact', label: 'Compact — fit more on the page' },
  { value: 'normal', label: 'Normal' },
  { value: 'relaxed', label: 'Relaxed — more air' },
];

export function ThemePanel({ store }: { store: CvDocumentStore }) {
  const { document, update } = store;
  const { theme } = document;

  const pageValue = theme.page.widthMm === LETTER.widthMm ? 'letter' : 'a4';

  return (
    <div className="theme-panel">
      <SelectField
        label="Template"
        value={theme.templateId}
        options={templates.map((template) => ({ value: template.id, label: template.name }))}
        onChange={(value) => update((doc) => editTheme(doc, { templateId: value }))}
      />

      <SelectField
        label="Typeface"
        value={theme.fontFamily}
        options={FONTS}
        onChange={(value) => update((doc) => editTheme(doc, { fontFamily: value }))}
      />

      <Field label="Accent">
        {() => (
          <div className="swatches" role="radiogroup" aria-label="Accent colour">
            {ACCENTS.map((accent) => (
              <button
                key={accent.value}
                type="button"
                role="radio"
                aria-checked={theme.accentColor === accent.value}
                aria-label={accent.label}
                title={accent.label}
                className={`swatch${theme.accentColor === accent.value ? ' is-selected' : ''}`}
                style={{ background: accent.value }}
                onClick={() => update((doc) => editTheme(doc, { accentColor: accent.value }))}
              />
            ))}
          </div>
        )}
      </Field>

      <SelectField
        label="Density"
        value={theme.density}
        options={DENSITIES}
        onChange={(value) => update((doc) => editTheme(doc, { density: value }))}
      />

      <Field label={`Text size — ${Math.round(theme.fontScale * 100)}%`} hint="Below 90% starts to look like hiding.">
        {(id) => (
          <input
            id={id}
            className="slider"
            type="range"
            min={0.85}
            max={1.25}
            step={0.01}
            value={theme.fontScale}
            onChange={(event) => update((doc) => editTheme(doc, { fontScale: Number(event.target.value) }))}
          />
        )}
      </Field>

      <SelectField
        label="Paper"
        value={pageValue}
        options={[
          { value: 'a4', label: 'A4 — UK, Europe' },
          { value: 'letter', label: 'US Letter' },
        ]}
        onChange={(value) =>
          update((doc) => editTheme(doc, { page: value === 'letter' ? LETTER : A4 }))
        }
      />

      <MarginControl
        page={theme.page}
        onChange={(page) => update((doc) => editTheme(doc, { page }))}
      />
    </div>
  );
}

function MarginControl({
  page,
  onChange,
}: {
  page: PageGeometry;
  onChange: (page: PageGeometry) => void;
}) {
  // One control for all four margins. Independent margins on a CV are a way to make an
  // asymmetric page by accident, and nobody has ever wanted a different left and right.
  const value = page.marginMm.left;

  return (
    <Field label={`Margins — ${value}mm`} hint="Under 12mm risks being clipped by an office printer.">
      {(id) => (
        <input
          id={id}
          className="slider"
          type="range"
          min={10}
          max={30}
          step={1}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange({
              ...page,
              marginMm: { top: next + 2, right: next, bottom: next + 2, left: next },
            });
          }}
        />
      )}
    </Field>
  );
}
