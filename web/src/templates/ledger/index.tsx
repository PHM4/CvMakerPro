import { standardBlocks } from '../standard';
import type { TemplateDefinition } from '../types';
import css from './ledger.css?raw';

export const ledger: TemplateDefinition = {
  id: 'ledger',
  name: 'Ledger',
  description: 'Sans, tighter, headings on a rule. Reads well in technical and startup hiring.',
  css,
  defaultFontFamily: 'Instrument Sans Variable',
  buildBlocks: (document) => standardBlocks(document, 'ledger'),
};
