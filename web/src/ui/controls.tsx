import { useId, type ReactNode, type TextareaHTMLAttributes, type InputHTMLAttributes } from 'react';

/*
 * Form primitives.
 *
 * Fields are ruled, not boxed: a label above a line, the way a form on paper works.
 * Outlined rounded input boxes are the default look of every admin panel ever generated,
 * and forty of them stacked in a column is a wall of identical rectangles with no
 * hierarchy. A rule under the text puts the emphasis on what was typed.
 */

interface FieldProps {
  label: string;
  /** Shown under the control. Use it for syntax hints, not for restating the label. */
  hint?: ReactNode;
  children: (id: string) => ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  const id = useId();

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children(id)}
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

export function TextField({ label, value, onChange, hint, ...rest }: TextFieldProps) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <input
          {...rest}
          id={id}
          className="control"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>;

export function TextAreaField({ label, value, onChange, hint, ...rest }: TextAreaFieldProps) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <textarea
          {...rest}
          id={id}
          className="control control-area"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

export function SelectField<T extends string>({ label, value, options, onChange }: SelectFieldProps<T>) {
  return (
    <Field label={label}>
      {(id) => (
        <select
          id={id}
          className="control"
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'quiet';
  type?: 'button' | 'submit';
  disabled?: boolean;
  title?: string;
}

export function Button({
  children,
  onClick,
  variant = 'ghost',
  type = 'button',
  disabled,
  title,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`button button-${variant}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

interface IconButtonProps {
  /** Read out by screen readers and shown on hover — these buttons carry no visible text. */
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}

export function IconButton({ label, onClick, disabled, children }: IconButtonProps) {
  return (
    <button
      type="button"
      className="icon-button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

/*
 * Glyphs are drawn rather than pulled from an icon set. A CV editor needs six of them,
 * and a thin-line icon library is both a dependency and the most recognisable tell of a
 * generated interface.
 */
export const Glyph = {
  Up: () => (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path d="M2.5 7.5 6 4l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  Down: () => (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  Cross: () => (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  Eye: ({ open }: { open: boolean }) => (
    <svg viewBox="0 0 14 12" width="14" height="12" aria-hidden="true">
      <path
        d="M1 6s2.2-3.5 6-3.5S13 6 13 6s-2.2 3.5-6 3.5S1 6 1 6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="7" cy="6" r="1.6" fill="currentColor" />
      {open ? null : <path d="M2 10.5 12 1.5" stroke="currentColor" strokeWidth="1.2" />}
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path d="M6 2v8M2 6h8" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  Spark: () => (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path d="M6 1.2 7.1 4.6 10.5 5.7 7.1 6.8 6 10.2 4.9 6.8 1.5 5.7 4.9 4.6Z" fill="currentColor" />
    </svg>
  ),
};
