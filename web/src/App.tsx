import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BulletAssist } from './assist/BulletAssist';
import { TailorPanel } from './assist/TailorPanel';
import { SignInDialog } from './auth/SignInDialog';
import { HeaderEditor } from './editor/HeaderEditor';
import { SectionEditor, type BulletContext } from './editor/SectionEditor';
import { ThemePanel } from './editor/ThemePanel';
import { useExport } from './export/useExport';
import { sampleDocument } from './model/sample';
import { PaperSurface, type PaperHandle } from './preview/PaperSurface';
import { mmToPx } from './preview/units';
import { addSection } from './state/documentEdits';
import { loadLocalDraft, useAutosave } from './state/useAutosave';
import { useCvDocument } from './state/useCvDocument';
import { useSession } from './state/useSession';
import { templateById } from './templates/registry';
import { Button, Glyph } from './ui/controls';

type Tab = 'content' | 'design' | 'tailor';

const PREVIEW_PADDING_PX = 36;

export function App() {
  // Whatever was open last, or the worked example. A blank page as a first impression makes a
  // CV builder look broken; the example is also how you see what the templates do.
  const store = useCvDocument(loadLocalDraft() ?? sampleDocument);
  const { document: cv, update, undo, redo, canUndo, canRedo } = store;

  const sessionStore = useSession();
  const { session } = sessionStore;
  const signedIn = session.status === 'signedIn';

  const [tab, setTab] = useState<Tab>('content');
  const [pageCount, setPageCount] = useState(1);
  const [showSignIn, setShowSignIn] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<PaperHandle>(null);
  const zoom = useFitZoom(stageRef, cv.theme.page.widthMm);
  const exporting = useExport(paperRef, cv);
  const save = useAutosave(cv, signedIn);

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

  const renderBulletAssist = useCallback(
    (context: BulletContext) => (signedIn ? <BulletAssist {...context} /> : null),
    [signedIn],
  );

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
          <SaveIndicator state={save} signedIn={signedIn} />
        </div>

        <div className="topbar-actions">
          <Button variant="quiet" onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">
            Undo
          </Button>
          <Button variant="quiet" onClick={redo} disabled={!canRedo} title="Redo (⇧⌘Z)">
            Redo
          </Button>
          {signedIn ? (
            <span className="account" title={session.email}>
              {session.email}
            </span>
          ) : (
            <Button onClick={() => setShowSignIn(true)}>Sign in</Button>
          )}
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

      {save.status === 'conflict' ? (
        <div className="banner banner-danger" role="alert">
          <span>
            This CV was changed somewhere else — another tab, or another device. Saving now would
            overwrite that. Reload to see the other version.
          </span>
          <Button variant="quiet" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      ) : null}

      <div className="workspace">
        <aside className="editor-pane">
          <nav className="tabs" role="tablist">
            {(['content', 'design', 'tailor'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                className={`tab${tab === value ? ' is-active' : ''}`}
                onClick={() => setTab(value)}
              >
                {value === 'content' ? 'Content' : value === 'design' ? 'Design' : 'Tailor'}
              </button>
            ))}
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
                    renderBulletAssist={renderBulletAssist}
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
            ) : null}

            {tab === 'design' ? <ThemePanel store={store} /> : null}

            {tab === 'tailor' ? (
              signedIn ? (
                <TailorPanel document={cv} />
              ) : (
                <div className="signed-out-note">
                  <p>
                    Comparing your CV against a job posting runs on the server, so it needs an
                    account. Everything else here works without one.
                  </p>
                  <Button variant="primary" onClick={() => setShowSignIn(true)}>
                    Sign in
                  </Button>
                </div>
              )
            ) : null}
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

      {showSignIn ? (
        <SignInDialog store={sessionStore} onClose={() => setShowSignIn(false)} />
      ) : null}
    </div>
  );
}

function SaveIndicator({
  state,
  signedIn,
}: {
  state: ReturnType<typeof useAutosave>;
  signedIn: boolean;
}) {
  if (!signedIn) {
    return <span className="save-state">Saved in this browser</span>;
  }

  switch (state.status) {
    case 'saving':
      return <span className="save-state">Saving…</span>;
    case 'saved':
      return (
        <span className="save-state is-saved">
          Saved {state.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      );
    case 'failed':
      return <span className="save-state is-failed">{state.message}</span>;
    case 'conflict':
      return <span className="save-state is-failed">Changed elsewhere</span>;
    default:
      return <span className="save-state">Saved in this browser</span>;
  }
}

/**
 * Scales the sheet to the width of the preview pane.
 *
 * A zoom control is the obvious alternative and it is worse: the only question anyone asks of a
 * CV preview is "does this fit", and that is answered by seeing the full width at once. The sheet
 * gets whatever room is left after the editor.
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
