import { z } from 'zod';

// --- Zod Runtime Validation (Löst: Finding 13) ---
export const SessionContextSchema = z.object({
  sessionId: z.string().max(128).regex(/^[a-zA-Z0-9\-_]+$/),
  turnIndex: z.number().int().min(0).max(10000),
  sessionStartedAt: z.string().datetime(),
});

export interface SessionContext {
  /** 
   * Cryptographically random, single-session-scoped token.
   * MUST NOT correlate to studentId or any user account identifier. 
   */
  sessionId: string;
  turnIndex: number;
  sessionStartedAt: string;
}

export class SessionTracker {
  private sessionContext: SessionContext;

  constructor(sessionId: string) {
    this.sessionContext = SessionContextSchema.parse({
      sessionId,
      turnIndex: 0,
      sessionStartedAt: new Date().toISOString(),
    });
  }

  public incrementTurn(): void {
    this.sessionContext.turnIndex++;
  }

  public getContext(): SessionContext {
    return { ...this.sessionContext };
  }
}
