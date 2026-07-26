import { standardBlocks } from '../standard';
import type { TemplateDefinition } from '../types';
import css from './marginal.css?raw';

export const marginal: TemplateDefinition = {
  id: 'marginal',
  name: 'Marginal',
  description: 'Dates in a left rail. Makes a long career easy to scan by year.',
  css,
  defaultFontFamily: 'Source Serif 4 Variable',
  buildBlocks: (document) => standardBlocks(document, 'marginal'),
};
