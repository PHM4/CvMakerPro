import { useCallback, useMemo, useReducer } from 'react';
import type { CvDocument } from '../model/document';

/**
 * Document state with undo.
 *
 * The interesting part is coalescing. A naive history pushes an entry per keystroke, so
 * Ctrl+Z deletes one character and users press it thirty times to get back to where they
 * were. Edits that carry the same key within a short window replace the previous entry
 * instead of stacking, which makes one undo step mean "that sentence I just typed".
 */

const COALESCE_WINDOW_MS = 700;

/** Deep history costs memory for documents nobody undoes back to. */
const MAX_HISTORY = 100;

interface HistoryState {
  past: CvDocument[];
  present: CvDocument;
  future: CvDocument[];
  lastKey: string | null;
  lastAt: number;
}

type HistoryAction =
  | { type: 'apply'; recipe: (document: CvDocument) => CvDocument; key: string | null; at: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; document: CvDocument };

function reduce(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'apply': {
      const next = action.recipe(state.present);
      if (next === state.present) {
        return state;
      }

      const coalesce =
        action.key !== null &&
        action.key === state.lastKey &&
        action.at - state.lastAt < COALESCE_WINDOW_MS;

      return {
        // Coalescing keeps the past as it was: the entry already on the stack is the
        // state from before this burst of typing started, which is what to undo to.
        past: coalesce ? state.past : trim([...state.past, state.present]),
        present: next,
        future: [],
        lastKey: action.key,
        lastAt: action.at,
      };
    }

    case 'undo': {
      const previous = state.past.at(-1);
      if (!previous) return state;

      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        lastKey: null,
        lastAt: 0,
      };
    }

    case 'redo': {
      const [next, ...rest] = state.future;
      if (!next) return state;

      return {
        past: trim([...state.past, state.present]),
        present: next,
        future: rest,
        lastKey: null,
        lastAt: 0,
      };
    }

    case 'reset':
      return initial(action.document);
  }
}

function trim(past: CvDocument[]): CvDocument[] {
  return past.length > MAX_HISTORY ? past.slice(past.length - MAX_HISTORY) : past;
}

function initial(document: CvDocument): HistoryState {
  return { past: [], present: document, future: [], lastKey: null, lastAt: 0 };
}

export interface CvDocumentStore {
  document: CvDocument;
  /**
   * Applies an edit. Pass a coalesceKey for anything driven by typing, so a sentence is
   * one undo step; leave it out for discrete actions like adding or deleting a section.
   */
  update: (recipe: (document: CvDocument) => CvDocument, coalesceKey?: string) => void;
  reset: (document: CvDocument) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useCvDocument(document: CvDocument): CvDocumentStore {
  const [state, dispatch] = useReducer(reduce, document, initial);

  const update = useCallback(
    (recipe: (document: CvDocument) => CvDocument, coalesceKey?: string) => {
      dispatch({ type: 'apply', recipe, key: coalesceKey ?? null, at: Date.now() });
    },
    [],
  );

  return useMemo(
    () => ({
      document: state.present,
      update,
      reset: (next: CvDocument) => dispatch({ type: 'reset', document: next }),
      undo: () => dispatch({ type: 'undo' }),
      redo: () => dispatch({ type: 'redo' }),
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
    }),
    [state, update],
  );
}
