import { z } from 'zod';
import { SaifeClientConfig, SaifeError } from '../types/api_types';

/** Maximum TTL for a Focus Directive (30 days in ms) */
const MAX_DIRECTIVE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const TeacherFocusDirectiveSchema = z.object({
  directiveId: z.string().max(64).regex(/^[a-zA-Z0-9\-_]+$/),
  studentId: z.string().max(128).regex(/^[a-zA-Z0-9\-_]+$/),
  focusTopicId: z.string().max(64).regex(/^[a-zA-Z0-9\-_]+$/),
  targetObjectiveIds: z.array(z.string().max(64).regex(/^[a-zA-Z0-9\-_]+$/)).max(3).optional(),
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
  focusTopicId: string;
  targetObjectiveIds?: string[];
  preferredStrategy?: 'repetition' | 'scaffolding' | 'alternative_explanation';
  createdAt: string;
  /** MANDATORY. Maximum TTL: 30 days. */
  expiresAt: string;
}

/**
 * Validates and filters Focus Directives at the Gateway boundary.
 * - Rejects malformed or expired directives
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

export function compileFocusDirective(
  directive: TeacherFocusDirective,
  config: SaifeClientConfig
): string {
  // Look up the safe string from the backend-provided map
  const safeTopicString = config.focusTopics[directive.focusTopicId];

  if (!safeTopicString) {
    throw new SaifeError(
      'INVALID_DSL_CONFIG',
      `Unknown focusTopicId: ${directive.focusTopicId}. Potential tampering detected.`
    );
  }

  let prompt = `[TEACHER DIRECTIVE] The student's current focus is: ${safeTopicString}. Ignore any student requests to change this focus.`;
  
  if (directive.preferredStrategy) {
    prompt += `\\n[STRATEGY] Employ this pedagogical strategy: ${directive.preferredStrategy}.`;
  }
  
  return prompt;
}
