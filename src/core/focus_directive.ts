import { z } from 'zod';

/** Maximum TTL for a Focus Directive (30 days in ms) */
const MAX_DIRECTIVE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// --- Zod Runtime Schema (Finding 13) ---
// Erlaubt nur Buchstaben (inkl. Umlaute), Zahlen, Leerzeichen und Bindestriche.
// Verhindert effektiv XML/HTML-Injection und Code-Ausführung.
const SafeTopicRegex = /^[a-zA-Z0-9\s\-_äöüÄÖÜß]+$/;

export const TeacherFocusDirectiveSchema = z.object({
  directiveId: z.string().max(64).regex(/^[a-zA-Z0-9\-_]+$/),
  studentId: z.string().max(128).regex(/^[a-zA-Z0-9\-_]+$/),
  focusTopic: z.string().min(2).max(50).regex(SafeTopicRegex),
  targetObjectives: z.array(z.string().max(100).regex(SafeTopicRegex)).max(3).optional(),
  preferredStrategy: z.enum(['repetition', 'scaffolding', 'alternative_explanation']).optional(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(), // MANDATORY (Finding 2)
}).refine(
  (data) => {
    const created = new Date(data.createdAt).getTime();
    const expires = new Date(data.expiresAt).getTime();
    return expires > created && (expires - created) <= MAX_DIRECTIVE_TTL_MS;
  },
  { message: `expiresAt must be after createdAt and within ${MAX_DIRECTIVE_TTL_MS / 86400000} days` }
);

export interface TeacherFocusDirective {
  directiveId: string;
  studentId: string;
  focusTopic: string;
  targetObjectives?: string[];
  preferredStrategy?: 'repetition' | 'scaffolding' | 'alternative_explanation';
  createdAt: string;
  /** MANDATORY. Maximum TTL: 30 days. */
  expiresAt: string;
}

/**
 * Validates and filters Focus Directives at the Gateway boundary.
 * - Rejects malformed or expired directives
 * - Ensures focusTopic passes the strict regex allowlist
 */
export function validateDirectives(
  raw: unknown[]
): { valid: TeacherFocusDirective[]; rejected: string[] } {
  const valid: TeacherFocusDirective[] = [];
  const rejected: string[] = [];

  for (const item of raw) {
    const result = TeacherFocusDirectiveSchema.safeParse(item);
    if (!result.success) {
      rejected.push(`Invalid directive: ${result.error.message}`);
      continue;
    }
    // Check expiry at runtime
    if (new Date(result.data.expiresAt).getTime() < Date.now()) {
      rejected.push(`Directive ${result.data.directiveId} expired`);
      continue;
    }
    valid.push(result.data as TeacherFocusDirective);
  }

  return { valid, rejected };
}
