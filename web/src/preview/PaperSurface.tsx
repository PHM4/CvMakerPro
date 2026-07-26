import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { contentHeightMm, type CvDocument } from '../model/document';
import type { TemplateDefinition } from '../templates/types';
import fontsCss from '../generated/fonts.css?raw';
import paperCss from '../templates/paper.css?raw';
import { paginate, type PaginatedPage } from './paginate';
import { paperVariables } from './paperStyles';
import { pxToMm } from './units';

/** Screen-only separation between sheets, in millimetres of document space. */
const PAGE_GAP_MM = 8;

interface PaperSurfaceProps {
  document: CvDocument;
  template: TemplateDefinition;
  /** 1 renders the sheet at its physical size. */
  zoom: number;
  onPageCountChange?: (count: number) => void;
}

/**
 * Renders the document into an iframe.
 *
 * The iframe is not decoration. The editor's own stylesheet must never reach the paper —
 * one inherited line-height from the app shell and the preview stops predicting the PDF.
 * An iframe gives a document with its own cascade for free, and it is the same isolation
 * the print service gets, which is the point.
 */
export function PaperSurface({ document: cv, template, zoom, onPageCountChange }: PaperSurfaceProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [frameDocument, setFrameDocument] = useState<Document | null>(null);
  const [pages, setPages] = useState<PaginatedPage[] | null>(null);

  const blocks = useMemo(() => template.buildBlocks(cv), [template, cv]);
  const stylesheet = useMemo(
    () => [fontsCss, paperCss, template.css, paperVariables(cv.theme)].join('\n'),
    [template, cv.theme],
  );

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const attach = () => setFrameDocument(frame.contentDocument ?? null);
    attach();
    frame.addEventListener('load', attach);
    return () => frame.removeEventListener('load', attach);
  }, []);

  // Styles are written imperatively rather than portalled, so they are in the document
  // before the measuring pass paints instead of one commit behind it.
  useLayoutEffect(() => {
    if (!frameDocument) return;

    let element = frameDocument.getElementById('paper-styles') as HTMLStyleElement | null;
    if (!element) {
      element = frameDocument.createElement('style');
      element.id = 'paper-styles';
      frameDocument.head.append(element);
    }

    element.textContent = stylesheet;
    frameDocument.documentElement.style.setProperty('--page-gap', `${PAGE_GAP_MM}mm`);
  }, [frameDocument, stylesheet]);

  useLayoutEffect(() => {
    if (!frameDocument || !measureRef.current) return;

    let cancelled = false;

    const measure = () => {
      const container = measureRef.current;
      if (cancelled || !container) return;

      const measured = blocks.map((block) => {
        const element = container.querySelector<HTMLElement>(`[data-block-key="${cssEscape(block.key)}"]`);
        return {
          key: block.key,
          heightMm: element ? pxToMm(element.getBoundingClientRect().height) : 0,
          spaceBeforeMm: block.spaceBeforeMm ?? 0,
          keepWithNext: block.keepWithNext ?? false,
        };
      });

      setPages(paginate(measured, contentHeightMm(cv.theme.page)));
    };

    /*
     * Measuring before the webfonts are ready produces heights for the fallback face,
     * and the page count settles on the wrong answer for a moment. font-display: block
     * keeps that from being visible, but the measurement still has to wait.
     */
    void frameDocument.fonts.ready.then(measure);

    return () => {
      cancelled = true;
    };
  }, [frameDocument, blocks, cv.theme, stylesheet]);

  useEffect(() => {
    if (pages) onPageCountChange?.(pages.length);
  }, [pages, onPageCountChange]);

  const nodesByKey = useMemo(
    () => new Map(blocks.map((block) => [block.key, block.node])),
    [blocks],
  );

  const pageCount = pages?.length ?? 1;
  const { widthMm, heightMm } = cv.theme.page;
  const stackHeightMm = pageCount * heightMm + (pageCount - 1) * PAGE_GAP_MM;

  return (
    <div
      className="paper-viewport"
      style={{
        width: `${widthMm * zoom}mm`,
        height: `${stackHeightMm * zoom}mm`,
      }}
    >
      <iframe
        ref={frameRef}
        className="paper-frame"
        title={`Preview of ${cv.title}`}
        style={{
          width: `${widthMm}mm`,
          height: `${stackHeightMm}mm`,
          transform: `scale(${zoom})`,
        }}
      />
      {frameDocument
        ? createPortal(
            <>
              <div className="paper-measure" ref={measureRef} aria-hidden="true">
                <div className={template.id}>
                  {blocks.map((block) => (
                    <div className="paper-block" data-block-key={block.key} key={block.key}>
                      {block.node}
                    </div>
                  ))}
                </div>
              </div>

              {pages?.map((page, index) => (
                <div className={`paper-page ${template.id}`} key={index}>
                  {page.items.map((item) => (
                    <div
                      className="paper-block"
                      key={item.key}
                      style={item.spaceBeforeMm > 0 ? { marginTop: `${item.spaceBeforeMm}mm` } : undefined}
                    >
                      {nodesByKey.get(item.key)}
                    </div>
                  ))}
                </div>
              ))}
            </>,
            frameDocument.body,
          )
        : null}
    </div>
  );
}

/** CSS.escape is unavailable inside a fresh about:blank in some engines. */
function cssEscape(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}
