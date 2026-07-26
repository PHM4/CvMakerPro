import { contentHeightMm, contentWidthMm, type Density, type Theme } from '../model/document';

/** Density is a multiplier on the vertical rhythm, not a set of separate stylesheets. */
const DENSITY_SCALE: Record<Density, number> = {
  compact: 0.78,
  normal: 1,
  relaxed: 1.24,
};

/**
 * The custom properties the paper and template stylesheets read, plus the @page rule.
 *
 * @page carries no margin. The sheet is a fixed-size padded box in the preview, and the
 * printed page is a hole of exactly that size, so the same box model produces both.
 */
export function paperVariables(theme: Theme): string {
  const { page } = theme;

  return `
:root {
  --page-width: ${mm(page.widthMm)};
  --page-height: ${mm(page.heightMm)};
  --page-margin-top: ${mm(page.marginMm.top)};
  --page-margin-right: ${mm(page.marginMm.right)};
  --page-margin-bottom: ${mm(page.marginMm.bottom)};
  --page-margin-left: ${mm(page.marginMm.left)};
  --page-content-width: ${mm(contentWidthMm(page))};
  --page-content-height: ${mm(contentHeightMm(page))};
  --doc-accent: ${theme.accentColor};
  --doc-font: '${theme.fontFamily.replace(/'/g, '')}';
  --font-scale: ${num(theme.fontScale)};
  --density: ${num(DENSITY_SCALE[theme.density])};
}

@page {
  size: ${mm(page.widthMm)} ${mm(page.heightMm)};
  margin: 0;
}
`;
}

function mm(value: number): string {
  return `${num(value)}mm`;
}

/**
 * Four decimal places, trailing zeros trimmed — the same shape as C#'s "0.####".
 *
 * Not cosmetic. On US Letter the content width is 215.9 - 16 - 16, which is 183.9 in C#
 * and 183.89999999999998 in JavaScript. The two sides would emit different stylesheets
 * for the same document, which is exactly the divergence this whole design exists to
 * prevent, and it would only ever have shown up for American users.
 */
function num(value: number): string {
  return String(Math.round(value * 10000) / 10000);
}
