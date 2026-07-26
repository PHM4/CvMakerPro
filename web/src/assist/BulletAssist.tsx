import { useState } from 'react';
import { assist, type BulletResponse } from '../api/client';
import type { BulletContext } from '../editor/SectionEditor';
import { Glyph, IconButton } from '../ui/controls';

type State =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'ready'; result: BulletResponse }
  | { status: 'failed'; message: string };

const APPROACH_LABELS: Record<string, string> = {
  'outcome-first': 'Outcome first',
  'action-first': 'Action first',
  shortest: 'Shortest',
};

/**
 * The assistant, attached to one bullet.
 *
 * It offers alternatives and never applies one. Every suggestion is a button the user presses,
 * and the original stays until they do — a writing tool that edits your CV out from under you is
 * a tool you stop trusting the first time it changes something you liked.
 */
export function BulletAssist({ entry, text, replace }: BulletContext) {
  const [state, setState] = useState<State>({ status: 'idle' });

  const run = async () => {
    if (text.trim() === '') {
      setState({ status: 'failed', message: 'Write something first — it rewrites, it does not invent.' });
      return;
    }

    setState({ status: 'working' });

    try {
      const result = await assist.bullet(text, entry.title, entry.organisation);
      setState({ status: 'ready', result });
    } catch (error) {
      setState({
        status: 'failed',
        message: error instanceof Error ? error.message : 'The assistant is unavailable.',
      });
    }
  };

  return (
    <>
      <IconButton
        label={state.status === 'working' ? 'Rewriting…' : 'Suggest rewrites'}
        onClick={run}
        disabled={state.status === 'working'}
      >
        <Glyph.Spark />
      </IconButton>

      {state.status === 'failed' ? (
        <p className="assist-note assist-note-danger" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.status === 'ready' ? (
        <div className="assist-panel">
          <p className="assist-assessment">{state.result.assessment}</p>

          <ul className="assist-list">
            {state.result.suggestions.map((suggestion, index) => (
              <li key={index}>
                <button
                  type="button"
                  className="assist-suggestion"
                  onClick={() => {
                    replace(suggestion.text);
                    setState({ status: 'idle' });
                  }}
                >
                  <span className="assist-approach">
                    {APPROACH_LABELS[suggestion.approach] ?? suggestion.approach}
                  </span>
                  <span>{suggestion.text}</span>
                </button>
              </li>
            ))}
          </ul>

          {state.result.needs.length > 0 ? (
            <div className="assist-needs">
              <span className="field-label">You would need to supply</span>
              <ul>
                {state.result.needs.map((need, index) => (
                  <li key={index}>{need}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <button type="button" className="assist-dismiss" onClick={() => setState({ status: 'idle' })}>
            Keep the original
          </button>
        </div>
      ) : null}
    </>
  );
}
