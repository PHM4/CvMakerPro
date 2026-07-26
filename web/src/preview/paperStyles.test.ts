import { describe, expect, it } from 'vitest';
import { A4, LETTER, type Theme } from '../model/document';
import { paperVariables } from './paperStyles';

/**
 * The other half of this test is PaperVariablesTests.cs, which asserts the same two
 * strings byte for byte. The browser and the print service each generate these variables
 * from their own copy of the logic — deliberately, so no stylesheet text crosses the
 * wire — and these goldens are what stop the copies drifting apart.
 *
 * If you change the output, change it in both places and update both goldens.
 */

const a4Theme: Theme = {
  templateId: 'sable',
  accentColor: '#7a2718',
  fontFamily: 'Source Serif 4 Variable',
  fontScale: 1.05,
  density: 'compact',
  page: A4,
};

const A4_EXPECTED = `
:root {
  --page-width: 210mm;
  --page-height: 297mm;
  --page-margin-top: 18mm;
  --page-margin-right: 16mm;
  --page-margin-bottom: 18mm;
  --page-margin-left: 16mm;
  --page-content-width: 178mm;
  --page-content-height: 261mm;
  --doc-accent: #7a2718;
  --doc-font: 'Source Serif 4 Variable';
  --font-scale: 1.05;
  --density: 0.78;
}

@page {
  size: 210mm 297mm;
  margin: 0;
}
`;

const LETTER_EXPECTED = `
:root {
  --page-width: 215.9mm;
  --page-height: 279.4mm;
  --page-margin-top: 18mm;
  --page-margin-right: 16mm;
  --page-margin-bottom: 18mm;
  --page-margin-left: 16mm;
  --page-content-width: 183.9mm;
  --page-content-height: 243.4mm;
  --doc-accent: #16150f;
  --doc-font: 'Instrument Sans Variable';
  --font-scale: 1;
  --density: 1;
}

@page {
  size: 215.9mm 279.4mm;
  margin: 0;
}
`;

describe('paperVariables', () => {
  it('matches the golden for A4', () => {
    expect(paperVariables(a4Theme)).toBe(A4_EXPECTED);
  });

  it('matches the golden for US Letter', () => {
    const theme: Theme = {
      ...a4Theme,
      accentColor: '#16150f',
      fontFamily: 'Instrument Sans Variable',
      fontScale: 1,
      density: 'normal',
      page: LETTER,
    };

    expect(paperVariables(theme)).toBe(LETTER_EXPECTED);
  });

  it('does not leak binary floating point into the stylesheet', () => {
    // 215.9 - 16 - 16 is 183.89999999999998 in IEEE 754.
    expect(paperVariables({ ...a4Theme, page: LETTER })).toContain('--page-content-width: 183.9mm;');
  });
});
