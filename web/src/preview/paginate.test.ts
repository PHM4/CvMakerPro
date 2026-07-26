import { describe, expect, it } from 'vitest';
import { paginate, type MeasuredBlock } from './paginate';

const PAGE = 100;

function block(key: string, heightMm: number, options: Partial<MeasuredBlock> = {}): MeasuredBlock {
  return { key, heightMm, spaceBeforeMm: 0, keepWithNext: false, ...options };
}

function keysOf(pages: ReturnType<typeof paginate>): string[][] {
  return pages.map((page) => page.items.map((item) => item.key));
}

describe('paginate', () => {
  it('keeps everything on one page when it fits', () => {
    const pages = paginate([block('a', 30), block('b', 30), block('c', 30)], PAGE);

    expect(keysOf(pages)).toEqual([['a', 'b', 'c']]);
  });

  it('starts a new page when the next block would overflow', () => {
    const pages = paginate([block('a', 60), block('b', 60)], PAGE);

    expect(keysOf(pages)).toEqual([['a'], ['b']]);
  });

  it('drops the leading space of a block that starts a page', () => {
    const pages = paginate(
      [block('a', 60), block('b', 60, { spaceBeforeMm: 10 })],
      PAGE,
    );

    expect(pages[1].items[0].spaceBeforeMm).toBe(0);
    expect(pages[1].usedMm).toBe(60);
  });

  it('counts spacing between blocks that share a page', () => {
    const pages = paginate(
      [block('a', 40), block('b', 40, { spaceBeforeMm: 10 })],
      PAGE,
    );

    expect(pages).toHaveLength(1);
    expect(pages[0].usedMm).toBe(90);
  });

  it('moves a heading forward rather than stranding it at the foot of a page', () => {
    // The heading fits in the 10mm left over; its section does not.
    const pages = paginate(
      [block('body', 90), block('heading', 8, { keepWithNext: true }), block('section', 30)],
      PAGE,
    );

    expect(keysOf(pages)).toEqual([['body'], ['heading', 'section']]);
  });

  it('moves a whole chain of kept-together blocks', () => {
    const pages = paginate(
      [
        block('body', 85),
        block('heading', 5, { keepWithNext: true }),
        block('jobTitle', 5, { keepWithNext: true }),
        block('firstBullet', 5, { keepWithNext: true }),
        block('secondBullet', 20),
      ],
      PAGE,
    );

    expect(keysOf(pages)).toEqual([
      ['body'],
      ['heading', 'jobTitle', 'firstBullet', 'secondBullet'],
    ]);
  });

  it('breaks inside a group that is taller than a page rather than overflowing', () => {
    const pages = paginate(
      [
        block('heading', 10, { keepWithNext: true }),
        block('huge', 80, { keepWithNext: true }),
        block('alsoHuge', 80),
      ],
      PAGE,
    );

    expect(keysOf(pages)).toEqual([['heading', 'huge'], ['alsoHuge']]);
    for (const page of pages) {
      expect(page.usedMm).toBeLessThanOrEqual(PAGE);
    }
  });

  it('accepts a block that exactly fills the page', () => {
    const pages = paginate([block('a', PAGE)], PAGE);

    expect(keysOf(pages)).toEqual([['a']]);
  });

  it('tolerates sub-millimetre measurement noise at the page boundary', () => {
    // Measurements arrive as converted pixel values, so exact fits are never exact.
    const pages = paginate([block('a', 60.0001), block('b', 39.9999)], PAGE);

    expect(keysOf(pages)).toEqual([['a', 'b']]);
  });

  it('never emits a page that overflows', () => {
    const blocks = Array.from({ length: 40 }, (_, index) =>
      block(`b${index}`, 7 + (index % 5) * 3, {
        spaceBeforeMm: index % 4 === 0 ? 4 : 1,
        keepWithNext: index % 6 === 0,
      }),
    );

    for (const page of paginate(blocks, PAGE)) {
      expect(page.usedMm).toBeLessThanOrEqual(PAGE + 0.05);
    }
  });

  it('places every block exactly once, in order', () => {
    const blocks = Array.from({ length: 40 }, (_, index) =>
      block(`b${index}`, 11, { spaceBeforeMm: 2, keepWithNext: index % 3 === 0 }),
    );

    const placed = keysOf(paginate(blocks, PAGE)).flat();

    expect(placed).toEqual(blocks.map((item) => item.key));
  });

  it('returns a single empty page for an empty document', () => {
    expect(keysOf(paginate([], PAGE))).toEqual([[]]);
  });
});
