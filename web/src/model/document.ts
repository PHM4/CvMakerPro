/*
 * Mirror of CvMakerPro.Domain. Hand-written for now; the API's OpenAPI schema will
 * generate it once the endpoints exist, at which point this file goes away.
 * WireContractTests.cs on the .NET side pins the shape these types assume.
 */

export type TextMark = 'bold' | 'italic' | 'code' | 'link';

export interface TextRun {
  text: string;
  /** Always present — the server writes an empty array rather than omitting it. */
  marks: TextMark[];
  href?: string;
}

export interface RichText {
  runs: TextRun[];
}

export interface YearMonth {
  year: number;
  /** 1-12. */
  month: number;
}

export interface DateRange {
  start: YearMonth;
  /** Absent means ongoing. */
  end?: YearMonth;
}

export interface Entry {
  id: string;
  title: string;
  organisation?: string;
  location?: string;
  dates?: DateRange;
  link?: string;
  bullets: RichText[];
  tags: string[];
}

export interface SkillGroup {
  id: string;
  label?: string;
  skills: string[];
}

interface SectionBase {
  id: string;
  heading: string;
  hidden: boolean;
}

export interface EntrySection extends SectionBase {
  kind: 'entries';
  entries: Entry[];
}

export interface SkillSection extends SectionBase {
  kind: 'skills';
  groups: SkillGroup[];
}

export interface ProseSection extends SectionBase {
  kind: 'prose';
  body: RichText;
}

export type Section = EntrySection | SkillSection | ProseSection;

export type SectionKind = Section['kind'];

export type Density = 'compact' | 'normal' | 'relaxed';

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PageGeometry {
  widthMm: number;
  heightMm: number;
  marginMm: Margins;
}

export interface Theme {
  templateId: string;
  /** `#rrggbb`. */
  accentColor: string;
  fontFamily: string;
  fontScale: number;
  density: Density;
  page: PageGeometry;
}

export type ContactKind =
  | 'email'
  | 'phone'
  | 'location'
  | 'website'
  | 'linkedIn'
  | 'gitHub'
  | 'other';

export interface ContactItem {
  id: string;
  kind: ContactKind;
  value: string;
  href?: string;
}

export interface Header {
  fullName: string;
  headline?: string;
  contacts: ContactItem[];
}

export interface CvDocument {
  id: string;
  title: string;
  header: Header;
  sections: Section[];
  theme: Theme;
  version: number;
  updatedAt: string;
}

export const A4: PageGeometry = {
  widthMm: 210,
  heightMm: 297,
  marginMm: { top: 18, right: 16, bottom: 18, left: 16 },
};

export const LETTER: PageGeometry = {
  widthMm: 215.9,
  heightMm: 279.4,
  marginMm: { top: 18, right: 16, bottom: 18, left: 16 },
};

export function contentWidthMm(page: PageGeometry): number {
  return page.widthMm - page.marginMm.left - page.marginMm.right;
}

export function contentHeightMm(page: PageGeometry): number {
  return page.heightMm - page.marginMm.top - page.marginMm.bottom;
}

export function isSectionEmpty(section: Section): boolean {
  switch (section.kind) {
    case 'entries':
      return section.entries.length === 0;
    case 'skills':
      return section.groups.every((group) => group.skills.length === 0);
    case 'prose':
      return isRichTextEmpty(section.body);
  }
}

export function isRichTextEmpty(text: RichText): boolean {
  return text.runs.every((run) => run.text.trim() === '');
}

export function plainText(text: RichText): string {
  return text.runs.map((run) => run.text).join('');
}

export function visibleSections(document: CvDocument): Section[] {
  return document.sections.filter((section) => !section.hidden && !isSectionEmpty(section));
}

export function plain(text: string): RichText {
  return { runs: [{ text, marks: [] }] };
}

export const emptyRichText: RichText = { runs: [] };
