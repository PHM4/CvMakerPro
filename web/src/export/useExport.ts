import { useCallback, useState } from 'react';
import { renderPdf } from '../api/client';
import type { CvDocument } from '../model/document';
import type { PaperHandle } from '../preview/PaperSurface';

export type ExportState =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'failed'; message: string };

export function useExport(paper: React.RefObject<PaperHandle | null>, document: CvDocument) {
  const [state, setState] = useState<ExportState>({ status: 'idle' });

  const run = useCallback(async () => {
    const bodyHtml = paper.current?.serialise();
    if (!bodyHtml) {
      // The preview paginates asynchronously — fonts have to settle first — so the button can be
      // pressed before there is a page to send.
      setState({ status: 'failed', message: 'The preview is still laying out. Try again in a moment.' });
      return;
    }

    setState({ status: 'working' });

    try {
      const blob = await renderPdf({
        templateId: document.theme.templateId,
        bodyHtml,
        theme: document.theme,
        documentTitle: document.title,
      });

      download(blob, `${slug(document.title)}.pdf`);
      setState({ status: 'idle' });
    } catch (error) {
      setState({
        status: 'failed',
        message: error instanceof Error ? error.message : 'Export failed.',
      });
    }
  }, [paper, document]);

  return { state, run, dismiss: () => setState({ status: 'idle' }) };
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoking immediately can cancel the download in some browsers; a tick is enough for the
  // navigation to have taken the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slug(title: string): string {
  const cleaned = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return cleaned === '' ? 'cv' : cleaned;
}
