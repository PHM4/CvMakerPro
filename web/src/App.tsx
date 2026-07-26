import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { HeaderEditor } from './editor/HeaderEditor';
import { SectionEditor } from './editor/SectionEditor';
import { ThemePanel } from './editor/ThemePanel';
import { useExport } from './export/useExport';
import { sampleDocument } from './model/sample';
import { PaperSurface, type PaperHandle } from './preview/PaperSurface';
import { mmToPx } from './preview/units';
import { addSection } from './state/documentEdits';
import { useCvDocument } from './state/useCvDocument';
import { templateById } from './templates/registry';
import { Button, Glyph } from './ui/controls';

type Tab = 'content' | 'design';

const PREVIEW_PADDING_PX = 36;

export function App() {
  const store = useCvDocument(sampleDocument);
  const { document: cv, update, undo, redo, canUndo, canRedo } = store;

  const [tab, setTab] = useState<Tab>('content');
  const [pageCount, setPageCount] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<PaperHandle>(null);
  const zoom = useFitZoom(stageRef, cv.theme.page.widthMm);
  const exporting = useExport(paperRef, cv);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta || event.key.toLowerCase() !== 'z') return;

      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  const template = templateById(cv.theme.templateId);

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand-mark">CvMakerPro</span>

        <div className="topbar-middle">
          <span className="doc-title">{cv.title}</span>
          <span className="page-count">
            {pageCount} {pageCount === 1 ? 'page' : 'pages'}
          </span>
        </div>

        <div className="topbar-actions">
          <Button variant="quiet" onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">
            Undo
          </Button>
          <Button variant="quiet" onClick={redo} disabled={!canRedo} title="Redo (⇧⌘Z)">
            Redo
          </Button>
          <Button
            variant="primary"
            onClick={exporting.run}
            disabled={exporting.state.status === 'working'}
          >
            {exporting.state.status === 'working' ? 'Printing…' : 'Export PDF'}
          </Button>
        </div>
      </header>

      {exporting.state.status === 'failed' ? (
        <div className="banner banner-danger" role="alert">
          <span>{exporting.state.message}</span>
          <Button variant="quiet" onClick={exporting.dismiss}>
            Dismiss
          </Button>
        </div>
      ) : null}

      <div className="workspace">
        <aside className="editor-pane">
          <nav className="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'content'}
              className={`tab${tab === 'content' ? ' is-active' : ''}`}
              onClick={() => setTab('content')}
            >
              Content
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'design'}
              className={`tab${tab === 'design' ? ' is-active' : ''}`}
              onClick={() => setTab('design')}
            >
              Design
            </button>
          </nav>

          <div className="editor-scroll">
            {tab === 'content' ? (
              <>
                <HeaderEditor store={store} />
                {cv.sections.map((section, index) => (
                  <SectionEditor
                    key={section.id}
                    store={store}
                    section={section}
                    index={index}
                    total={cv.sections.length}
                  />
                ))}

                <div className="add-section">
                  <span className="field-label">Add a section</span>
                  <div className="add-section-buttons">
                    <Button onClick={() => update((doc) => addSection(doc, 'entries'))}>
                      <Glyph.Plus /> Dated entries
                    </Button>
                    <Button onClick={() => update((doc) => addSection(doc, 'skills'))}>
                      <Glyph.Plus /> Skills
                    </Button>
                    <Button onClick={() => update((doc) => addSection(doc, 'prose'))}>
                      <Glyph.Plus /> Paragraph
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <ThemePanel store={store} />
            )}
          </div>
        </aside>

        <main className="preview-pane" ref={stageRef}>
          <div className="preview-scroll">
            <PaperSurface
              ref={paperRef}
              document={cv}
              template={template}
              zoom={zoom}
              onPageCountChange={setPageCount}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Scales the sheet to the width of the preview pane.
 *
 * A zoom control is the obvious alternative and it is worse: the only question anyone
 * asks of a CV preview is "does this fit", and that is answered by seeing the full width
 * at once. The sheet gets whatever room is left after the editor.
 */
function useFitZoom(ref: React.RefObject<HTMLElement | null>, pageWidthMm: number): number {
  const [zoom, setZoom] = useState(0.7);

  const measure = useCallback(() => {
    const element = ref.current;
    if (!element) return;

    const available = element.clientWidth - 2 * PREVIEW_PADDING_PX;
    setZoom(clamp(available / mmToPx(pageWidthMm), 0.35, 1.4));
  }, [ref, pageWidthMm]);

  useLayoutEffect(() => {
    measure();

    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure, ref]);

  return zoom;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
