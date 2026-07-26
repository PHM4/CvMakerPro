import { useState } from 'react';
import { assist, type TailorResponse } from '../api/client';
import type { CvDocument } from '../model/document';
import { Button, TextAreaField } from '../ui/controls';

type State =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'ready'; result: TailorResponse }
  | { status: 'failed'; message: string };

export function TailorPanel({ document }: { document: CvDocument }) {
  const [posting, setPosting] = useState('');
  const [state, setState] = useState<State>({ status: 'idle' });

  const run = async () => {
    setState({ status: 'working' });

    try {
      setState({ status: 'ready', result: await assist.tailor(document, posting) });
    } catch (error) {
      setState({
        status: 'failed',
        message: error instanceof Error ? error.message : 'The assistant is unavailable.',
      });
    }
  };

  return (
    <div className="tailor">
      <TextAreaField
        label="Job posting"
        rows={10}
        value={posting}
        placeholder="Paste the advert here."
        hint="Nothing is stored. This is sent once, to compare against your CV."
        onChange={setPosting}
      />

      <Button variant="primary" onClick={run} disabled={posting.trim() === '' || state.status === 'working'}>
        {state.status === 'working' ? 'Reading…' : 'Compare with my CV'}
      </Button>

      {state.status === 'failed' ? (
        <p className="assist-note assist-note-danger" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.status === 'ready' ? <TailorResult result={state.result} /> : null}
    </div>
  );
}

function TailorResult({ result }: { result: TailorResponse }) {
  const coverage = Math.round(result.keywords.coverage * 100);

  return (
    <div className="tailor-result">
      <p className="assist-assessment">{result.summary}</p>

      <div className="coverage">
        <div className="coverage-head">
          <span className="field-label">Term coverage</span>
          <span className="coverage-value">{coverage}%</span>
        </div>
        <div className="coverage-track">
          <div className="coverage-fill" style={{ width: `${coverage}%` }} />
        </div>
        <p className="field-hint">
          How many of the posting's repeated terms appear anywhere on your CV. Computed by
          matching text, not judged — it is a spell-check, not a score.
        </p>
      </div>

      {result.keywords.missing.length > 0 ? (
        <div className="chips">
          <span className="field-label">Not on your CV</span>
          <div className="chip-row">
            {result.keywords.missing.map((match) => (
              <span className="chip" key={match.term} title={`Mentioned ${match.jobMentions}× in the posting`}>
                {match.term}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {result.suggestions.length > 0 ? (
        <div className="suggestions">
          <span className="field-label">Suggested changes</span>
          {result.suggestions.map((suggestion, index) => (
            <article className="suggestion" key={index}>
              <h4>{suggestion.where}</h4>
              <p>{suggestion.change}</p>
              <p className="suggestion-why">{suggestion.why}</p>
            </article>
          ))}
        </div>
      ) : null}

      {result.gaps.length > 0 ? (
        <div className="gaps">
          <span className="field-label">Genuine gaps</span>
          <ul>
            {result.gaps.map((gap, index) => (
              <li key={index}>{gap}</li>
            ))}
          </ul>
          <p className="field-hint">
            These are things the CV does not evidence. Worth knowing before the interview rather
            than writing around.
          </p>
        </div>
      ) : null}
    </div>
  );
}
