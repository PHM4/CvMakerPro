import type { CvDocument, Theme } from '../model/document';

/**
 * The API lives behind the same origin as this app, so requests are same-origin and the session
 * cookie rides along without any token handling here. That is why there is no Authorization
 * header, no refresh logic, and no token in localStorage waiting to be stolen.
 */
const BASE = '/api';

export class ApiError extends Error {
  readonly status: number;
  readonly body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/** Raised when a save is based on a version the server has already moved past. */
export class ConflictError extends ApiError {
  readonly expected: number;
  readonly actual: number;

  constructor(expected: number, actual: number, message: string) {
    super(409, message);
    this.name = 'ConflictError';
    this.expected = expected;
    this.actual = actual;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (response.status === 409) {
    const body = await safeJson(response);
    throw new ConflictError(
      (body as { expected?: number })?.expected ?? 0,
      (body as { actual?: number })?.actual ?? 0,
      (body as { message?: string })?.message ?? 'This CV changed somewhere else.',
    );
  }

  if (!response.ok) {
    const body = await safeJson(response);
    throw new ApiError(response.status, messageFrom(body) ?? response.statusText, body);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function messageFrom(body: unknown): string | undefined {
  if (typeof body === 'object' && body !== null) {
    const record = body as Record<string, unknown>;
    for (const key of ['message', 'detail', 'title']) {
      if (typeof record[key] === 'string') return record[key];
    }
  }

  return undefined;
}

/* Auth -------------------------------------------------------------------- */

export const auth = {
  register: (email: string, password: string) =>
    request<void>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // useCookies keeps the session in an http-only cookie instead of handing this app a bearer
  // token it would then have to store somewhere a script can read.
  login: (email: string, password: string) =>
    request<void>('/auth/login?useCookies=true', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  info: () => request<{ email: string }>('/auth/manage/info'),
};

/* Documents --------------------------------------------------------------- */

export interface DocumentSummary {
  id: string;
  title: string;
  version: number;
  updatedAt: string;
}

export const documents = {
  list: () => request<DocumentSummary[]>('/documents'),

  get: (id: string) => request<CvDocument>(`/documents/${id}`),

  create: (document: CvDocument) =>
    request<CvDocument>('/documents', { method: 'POST', body: JSON.stringify(document) }),

  update: (id: string, document: CvDocument) =>
    request<CvDocument>(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(document) }),

  remove: (id: string) => request<void>(`/documents/${id}`, { method: 'DELETE' }),

  versions: (id: string) => request<DocumentSummary[]>(`/documents/${id}/versions`),

  version: (id: string, version: number) =>
    request<CvDocument>(`/documents/${id}/versions/${version}`),
};

/* Render ------------------------------------------------------------------ */

export interface RenderRequest {
  templateId: string;
  bodyHtml: string;
  theme: Theme;
  documentTitle: string;
}

export async function renderPdf(payload: RenderRequest): Promise<Blob> {
  const response = await fetch(`${BASE}/render/pdf`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ApiError(response.status, messageFrom(await safeJson(response)) ?? 'Export failed.');
  }

  return response.blob();
}

/* Assistant --------------------------------------------------------------- */

export interface BulletSuggestion {
  text: string;
  approach: 'outcome-first' | 'action-first' | 'shortest';
}

export interface BulletResponse {
  assessment: string;
  suggestions: BulletSuggestion[];
  /** Figures the user would need to supply. The assistant is not allowed to invent them. */
  needs: string[];
}

export interface TailorSuggestion {
  where: string;
  change: string;
  why: string;
}

export interface KeywordMatch {
  term: string;
  jobMentions: number;
  presentInCv: boolean;
}

export interface TailorResponse {
  summary: string;
  suggestions: TailorSuggestion[];
  gaps: string[];
  keywords: {
    matched: KeywordMatch[];
    missing: KeywordMatch[];
    coverage: number;
  };
}

export const assist = {
  bullet: (text: string, role?: string, organisation?: string) =>
    request<BulletResponse>('/assist/bullet', {
      method: 'POST',
      body: JSON.stringify({ text, role, organisation }),
    }),

  tailor: (document: CvDocument, jobDescription: string) =>
    request<TailorResponse>('/assist/tailor', {
      method: 'POST',
      body: JSON.stringify({ document, jobDescription }),
    }),
};
