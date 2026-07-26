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
  --page-width: ${page.widthMm}mm;
  --page-height: ${page.heightMm}mm;
  --page-margin-top: ${page.marginMm.top}mm;
  --page-margin-right: ${page.marginMm.right}mm;
  --page-margin-bottom: ${page.marginMm.bottom}mm;
  --page-margin-left: ${page.marginMm.left}mm;
  --page-content-width: ${contentWidthMm(page)}mm;
  --page-content-height: ${contentHeightMm(page)}mm;
  --doc-accent: ${theme.accentColor};
  --doc-font: '${theme.fontFamily.replace(/'/g, '')}';
  --font-scale: ${theme.fontScale};
  --density: ${DENSITY_SCALE[theme.density]};
}

@page {
  size: ${page.widthMm}mm ${page.heightMm}mm;
  margin: 0;
}
`;
}
