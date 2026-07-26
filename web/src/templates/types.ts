import type { ReactNode } from 'react';
import type { CvDocument } from '../model/document';

/**
 * A template does not lay out pages. It emits a flat list of blocks and the paginator
 * decides where the paper runs out.
 *
 * The split exists because page breaks are the one thing a CV builder cannot get wrong:
 * if templates each did their own breaking, every template would need its own orphan
 * rules and every one of them would have a different bug. Here there is one paginator,
 * and a template's only say in the matter is the metadata on each block.
 */
export interface FlowBlock {
  key: string;

  node: ReactNode;

  /**
   * This block is meaningless as the last thing on a page — a section heading with its
   * section overleaf, or a job title separated from its first bullet. The paginator
   * pushes it forward rather than stranding it.
   */
  keepWithNext?: boolean;

  /**
   * Space above the block, dropped when the block starts a page. Margins that survive a
   * page break leave every continuation page with a mysterious indent at the top.
   */
  spaceBeforeMm?: number;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  /** One line, shown in the template picker. Describe the document, not the adjectives. */
  description: string;

  /** Stylesheet injected into the paper document. Must not reference anything remote. */
  css: string;

  buildBlocks: (document: CvDocument) => FlowBlock[];
}
