import { sable } from './sable';
import type { TemplateDefinition } from './types';

export const templates: TemplateDefinition[] = [sable];

export const defaultTemplateId = sable.id;

export function templateById(id: string): TemplateDefinition {
  // A document referencing a template that has been withdrawn still has to open, so this
  // falls back rather than throwing. Losing the layout beats losing access to the text.
  return templates.find((template) => template.id === id) ?? sable;
}
