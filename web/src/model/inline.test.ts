import { describe, expect, it } from 'vitest';
import { parseInline, serializeInline } from './inline';

describe('parseInline', () => {
  it('returns a single plain run for plain text', () => {
    expect(parseInline('Cut deploy time to four minutes.')).toEqual({
      runs: [{ text: 'Cut deploy time to four minutes.', marks: [] }],
    });
  });

  it('splits bold out of surrounding text', () => {
    expect(parseInline('Cut **deploy time** to four minutes.').runs).toEqual([
      { text: 'Cut ', marks: [] },
      { text: 'deploy time', marks: ['bold'] },
      { text: ' to four minutes.', marks: [] },
    ]);
  });

  it('reads italic, code and links', () => {
    expect(parseInline('*why* `git bisect` [docs](https://example.com)').runs).toEqual([
      { text: 'why', marks: ['italic'] },
      { text: ' ', marks: [] },
      { text: 'git bisect', marks: ['code'] },
      { text: ' ', marks: [] },
      { text: 'docs', marks: ['link'], href: 'https://example.com' },
    ]);
  });

  it('adds a scheme to a bare domain', () => {
    expect(parseInline('[site](example.com/x)').runs[0].href).toBe('https://example.com/x');
  });

  it('drops a javascript: href rather than storing it', () => {
    // eslint-disable-next-line no-script-url
    expect(parseInline('[click](javascript:alert(1))').runs[0].href).toBeUndefined();
  });

  it('leaves an unmatched asterisk alone', () => {
    expect(parseInline('5 * 3 = 15').runs).toEqual([{ text: '5 * 3 = 15', marks: [] }]);
  });

  it('handles an empty string', () => {
    expect(parseInline('')).toEqual({ runs: [] });
  });
});

describe('round trip', () => {
  const cases = [
    'plain text',
    'Cut **deploy time** to four minutes.',
    'a *b* c `d` e',
    '[docs](https://example.com) at the start',
    'trailing **bold**',
    '',
  ];

  it.each(cases)('survives parse then serialize: %j', (input) => {
    expect(serializeInline(parseInline(input))).toBe(input);
  });
});
