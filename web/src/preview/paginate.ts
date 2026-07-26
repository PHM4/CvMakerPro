/**
 * Packs measured blocks onto pages.
 *
 * This is deliberately a pure function over measurements rather than anything that
 * touches the DOM: page breaking is the part of a CV builder that users actually notice
 * going wrong, and it needs to be testable without a browser.
 */

export interface MeasuredBlock {
  key: string;
  heightMm: number;
  /** Space above the block, applied only when it is not the first thing on a page. */
  spaceBeforeMm: number;
  keepWithNext: boolean;
}

export interface PaginatedPage {
  /** Block keys in order, each with the space that precedes it on this page. */
  items: Array<{ key: string; spaceBeforeMm: number }>;
  usedMm: number;
}

/**
 * Floating-point slack. Heights come from getBoundingClientRect and are converted from
 * pixels, so a block that exactly fills the page routinely measures a few thousandths
 * over it. Without this, such a block is bumped to a page of its own.
 */
const TOLERANCE_MM = 0.05;

export function paginate(blocks: MeasuredBlock[], contentHeightMm: number): PaginatedPage[] {
  const pages: PaginatedPage[] = [emptyPage()];

  const place = (block: MeasuredBlock, allowSpace: boolean) => {
    const page = pages[pages.length - 1];
    const space = page.items.length === 0 || !allowSpace ? 0 : block.spaceBeforeMm;

    if (page.items.length > 0 && page.usedMm + space + block.heightMm > contentHeightMm + TOLERANCE_MM) {
      pages.push(emptyPage());
      place(block, false);
      return;
    }

    const target = pages[pages.length - 1];
    target.items.push({ key: block.key, spaceBeforeMm: space });
    target.usedMm += space + block.heightMm;
  };

  for (const group of groupKeptTogether(blocks)) {
    const height = groupHeightMm(group);
    const page = pages[pages.length - 1];
    const space = page.items.length === 0 ? 0 : group[0].spaceBeforeMm;

    if (page.usedMm + space + height <= contentHeightMm + TOLERANCE_MM) {
      appendGroup(page, group, space);
      continue;
    }

    if (height <= contentHeightMm + TOLERANCE_MM) {
      // Fits on a fresh sheet: move the whole group rather than splitting it.
      const next = emptyPage();
      pages.push(next);
      appendGroup(next, group, 0);
      continue;
    }

    /*
     * Taller than an entire page. Something has to give, and it is better to break
     * inside the group than to emit a page that overflows and gets silently clipped
     * by the printer. In practice this is a pathological entry — forty bullets on one
     * job — and breaking it is what a word processor would do too.
     */
    for (const block of group) {
      place(block, true);
    }
  }

  return pages;
}

function emptyPage(): PaginatedPage {
  return { items: [], usedMm: 0 };
}

function appendGroup(page: PaginatedPage, group: MeasuredBlock[], leadingSpaceMm: number) {
  group.forEach((block, index) => {
    const space = index === 0 ? leadingSpaceMm : block.spaceBeforeMm;
    page.items.push({ key: block.key, spaceBeforeMm: space });
    page.usedMm += space + block.heightMm;
  });
}

/**
 * Runs of blocks chained by keepWithNext travel together. Expressing the rule as groups
 * rather than as a fix-up pass after packing avoids the obvious trap: pulling a stranded
 * heading onto the next page can overflow that page, which then needs its own fix-up,
 * and the corrections chase each other down the document.
 */
function groupKeptTogether(blocks: MeasuredBlock[]): MeasuredBlock[][] {
  const groups: MeasuredBlock[][] = [];
  let current: MeasuredBlock[] = [];

  for (const block of blocks) {
    current.push(block);
    if (!block.keepWithNext) {
      groups.push(current);
      current = [];
    }
  }

  // A trailing keepWithNext has nothing to keep with — it ends the document.
  if (current.length > 0) {
    groups.push(current);
  }

  return groups;
}

function groupHeightMm(group: MeasuredBlock[]): number {
  return group.reduce(
    (total, block, index) => total + block.heightMm + (index === 0 ? 0 : block.spaceBeforeMm),
    0,
  );
}
