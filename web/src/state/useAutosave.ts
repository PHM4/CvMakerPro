import { useEffect, useRef, useState } from 'react';
import { ConflictError, documents } from '../api/client';
import type { CvDocument } from '../model/document';

export type SaveState =
  | { status: 'local' }
  | { status: 'saving' }
  | { status: 'saved'; at: Date }
  | { status: 'conflict' }
  | { status: 'failed'; message: string };

const DEBOUNCE_MS = 1500;
const LOCAL_KEY = 'cvmakerpro:draft';

/**
 * Persists the document.
 *
 * Two tiers on purpose. The local draft is written on every settled edit and is what makes the
 * app usable before anyone signs up — close the tab, come back, your CV is there. The server
 * copy is layered on top once there is an account to attach it to.
 *
 * Saving is debounced and, more importantly, skipped when nothing changed. The document model
 * has structural equality precisely so that check is cheap and honest; with reference equality
 * every keystroke would look like a change and this would write continuously.
 */
export function useAutosave(document: CvDocument, enabled: boolean) {
  const [state, setState] = useState<SaveState>({ status: 'local' });
  const lastSaved = useRef<CvDocument | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The local draft is written unconditionally — it costs nothing and it is the safety net.
  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(document));
    } catch {
      // Private browsing, or the quota is full. Losing the draft is bad but not worth
      // interrupting the user over, and the server copy is the real one anyway.
    }
  }, [document]);

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'local' });
      return;
    }

    if (lastSaved.current !== null && equal(lastSaved.current, document)) {
      return;
    }

    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(async () => {
      setState({ status: 'saving' });

      try {
        const saved = await documents.update(document.id, document);
        lastSaved.current = saved;
        setState({ status: 'saved', at: new Date() });
      } catch (error) {
        if (error instanceof ConflictError) {
          // Another tab got there first. Overwriting would silently discard whatever it wrote,
          // so this stops and lets the user decide.
          setState({ status: 'conflict' });
          return;
        }

        setState({
          status: 'failed',
          message: error instanceof Error ? error.message : 'Could not save.',
        });
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [document, enabled]);

  return state;
}

export function loadLocalDraft(): CvDocument | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as CvDocument) : null;
  } catch {
    return null;
  }
}

/** Cheap structural comparison — the document is plain JSON all the way down. */
function equal(a: CvDocument, b: CvDocument): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
