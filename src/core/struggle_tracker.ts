/**
 * ADVISORY-ONLY Struggle Tracker.
 *
 * GDPR/EU AI Act Compliance:
 * - This tracker does NOT autonomously invoke fallback_policy (Art. 22 GDPR).
 * - It emits a RECOMMENDATION event to the teacher dashboard.
 * - Teacher confirmation is REQUIRED before the AI's behavior changes (Art. 14 EU AI Act).
 * - The consecutiveFailures counter is volatile (in-memory, per-request-chain only)
 *   and is never persisted, logged, or emitted to any telemetry stream.
 */
export interface StruggleRecommendation {
  type: 'struggle_recommendation';
  /** Always true — teacher must confirm before action is taken */
  requiresTeacherConfirmation: true;
  /** The recommended pedagogical intervention */
  recommendedAction: 'offer_hint' | 'direct_correction' | 'step_back';
  /** How many consecutive turns without progress (for dashboard display) */
  consecutiveTurnsWithoutProgress: number;
  /** LLM-assessed barrier (formative only, unverified) */
  identifiedBarrier?: string;
  /** Always true — this is a heuristic, not a verified assessment */
  is_formative_only: true;
}

import { ISessionStore } from '../types/api_types';

export class StruggleTracker {
  constructor(private store: ISessionStore, private sessionId: string) {}

  /**
   * Called after each turn with the LLM's assessment of student progress.
   * Returns a StruggleRecommendation if threshold is exceeded.
   *
   * IMPORTANT: The recommendation must be sent to the dashboard for
   * teacher review. It must NOT be auto-executed by the orchestrator.
   */
  async evaluateTurn(
    progressDetected: boolean,
    threshold: number,
    fallbackPolicy: 'offer_hint' | 'direct_correction' | 'step_back',
    barrier?: string
  ): Promise<StruggleRecommendation | null> {
    if (progressDetected) {
      await this.store.resetStruggle(this.sessionId);
      return null;
    }

    const consecutiveFailures = await this.store.incrementStruggle(this.sessionId);

    if (consecutiveFailures >= threshold) {
      return {
        type: 'struggle_recommendation',
        requiresTeacherConfirmation: true,
        recommendedAction: fallbackPolicy,
        consecutiveTurnsWithoutProgress: consecutiveFailures,
        identifiedBarrier: barrier,
        is_formative_only: true,
      };
    }

    return null;
  }

  async reset(): Promise<void> {
    await this.store.resetStruggle(this.sessionId);
  }
}
