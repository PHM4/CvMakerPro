/**
 * CSS defines 1in as exactly 96px and 1in as 25.4mm, so this conversion is exact rather
 * than a device measurement. It holds in the preview and in the print engine, which is
 * what lets a height measured on screen be trusted on paper.
 */
export const PX_PER_MM = 96 / 25.4;

export function mmToPx(mm: number): number {
  return mm * PX_PER_MM;
}

export function pxToMm(px: number): number {
  return px / PX_PER_MM;
}
