import { A4, plain, type CvDocument } from './document';

/**
 * The document behind "See an example". It is also what the preview is developed
 * against, so it deliberately includes the awkward cases: a two-line job title, an
 * ongoing role, an entry with no dates, and enough bullets to force a second page.
 */
export const sampleDocument: CvDocument = {
  id: '00000000-0000-0000-0000-000000000001',
  title: 'Example CV',
  header: {
    fullName: 'Rowan Whitaker',
    headline: 'Backend engineer — distributed systems, payments',
    contacts: [
      { id: 'c-email', kind: 'email', value: 'rowan.whitaker@example.com' },
      { id: 'c-phone', kind: 'phone', value: '+44 7700 900412' },
      { id: 'c-loc', kind: 'location', value: 'Manchester, UK' },
      { id: 'c-gh', kind: 'gitHub', value: 'github.com/rwhitaker' },
    ],
  },
  sections: [
    {
      kind: 'prose',
      id: 's-profile',
      heading: 'Profile',
      hidden: false,
      body: plain(
        'Backend engineer with four years on payment infrastructure. Most of my work has been ' +
          'on the unglamorous half of reliability: idempotency, reconciliation, and making ' +
          'retries safe. I am looking for a team where correctness under load is the hard part.',
      ),
    },
    {
      kind: 'entries',
      id: 's-experience',
      heading: 'Experience',
      hidden: false,
      entries: [
        {
          id: 'e-northgate',
          title: 'Senior Backend Engineer',
          organisation: 'Northgate Payments',
          location: 'Manchester',
          dates: { start: { year: 2023, month: 4 } },
          bullets: [
            plain(
              'Rebuilt the settlement reconciler around an append-only ledger, cutting unmatched ' +
                'transactions from roughly 400 a day to under 20 and ending the manual morning sweep.',
            ),
            plain(
              'Introduced idempotency keys across the payments API. Duplicate charges from client ' +
                'retries went from a weekly incident to none in the eighteen months since.',
            ),
            plain(
              'Took the p99 on the authorisation path from 840ms to 210ms by replacing a chatty ' +
                'per-item risk lookup with a batched one.',
            ),
            plain(
              'Mentored two graduate engineers through their first on-call rotations, and rewrote ' +
                'the runbook they kept telling me was wrong.',
            ),
          ],
          tags: ['C#', '.NET', 'PostgreSQL', 'Kafka', 'AWS'],
        },
        {
          id: 'e-brightloom',
          title: 'Backend Engineer',
          organisation: 'Brightloom',
          location: 'Remote',
          dates: { start: { year: 2021, month: 9 }, end: { year: 2023, month: 3 } },
          bullets: [
            plain(
              'Owned the export pipeline that produced customer reports, moving it off a nightly ' +
                'cron onto a queue and dropping the failure rate from 6% to under 0.5%.',
            ),
            plain(
              'Wrote the migration that split a 40-table monolith schema into two services without ' +
                'downtime, using dual writes and a two-week verification window.',
            ),
            plain('Added contract tests between the two services after a release broke both at once.'),
          ],
          tags: ['C#', 'RabbitMQ', 'Terraform'],
        },
        {
          id: 'e-hartwell',
          title: 'Junior Developer',
          organisation: 'Hartwell Systems',
          location: 'Leeds',
          dates: { start: { year: 2020, month: 7 }, end: { year: 2021, month: 8 } },
          bullets: [
            plain('Maintained an internal scheduling tool used by around 300 warehouse staff.'),
            plain(
              'Replaced a spreadsheet import that silently dropped malformed rows with one that ' +
                'reported them, which turned out to be about 3% of every upload.',
            ),
          ],
          tags: [],
        },
      ],
    },
    {
      kind: 'entries',
      id: 's-education',
      heading: 'Education',
      hidden: false,
      entries: [
        {
          id: 'e-uni',
          title: 'BSc Computer Science, First Class',
          organisation: 'University of Leeds',
          dates: { start: { year: 2017, month: 9 }, end: { year: 2020, month: 6 } },
          bullets: [
            plain('Dissertation on consensus under partial synchrony, marked 78.'),
          ],
          tags: [],
        },
      ],
    },
    {
      kind: 'skills',
      id: 's-skills',
      heading: 'Skills',
      hidden: false,
      groups: [
        { id: 'g-lang', label: 'Languages', skills: ['C#', 'TypeScript', 'Python', 'SQL'] },
        { id: 'g-infra', label: 'Infrastructure', skills: ['AWS', 'Terraform', 'Docker', 'GitHub Actions'] },
        { id: 'g-data', label: 'Data', skills: ['PostgreSQL', 'Kafka', 'Redis'] },
      ],
    },
    {
      kind: 'entries',
      id: 's-projects',
      heading: 'Projects',
      hidden: false,
      entries: [
        {
          id: 'e-ledger',
          title: 'ledgerfmt',
          bullets: [
            plain(
              'A formatter for plain-text accounting files. About 900 downloads and, more usefully, ' +
                'three bug reports from people who found cases I had not thought of.',
            ),
          ],
          tags: ['Rust'],
        },
      ],
    },
  ],
  theme: {
    templateId: 'sable',
    accentColor: '#16150f',
    fontFamily: 'Source Serif 4 Variable',
    fontScale: 1,
    density: 'normal',
    page: A4,
  },
  version: 1,
  updatedAt: '2026-07-01T00:00:00Z',
};
