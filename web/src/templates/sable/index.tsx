import { standardBlocks } from '../standard';
import type { TemplateDefinition } from '../types';
// Raw, not a Vite-processed stylesheet: this exact text is also shipped to the render service,
// and a preview styled by one pipeline and printed by another is a guess.
import css from './sable.css?raw';

export const sable: TemplateDefinition = {
  id: 'sable',
  name: 'Sable',
  description: 'One column, serif, dated right. The layout most hiring managers expect.',
  css,
  defaultFontFamily: 'Source Serif 4 Variable',
  buildBlocks: (document) => standardBlocks(document, 'sable'),
};
