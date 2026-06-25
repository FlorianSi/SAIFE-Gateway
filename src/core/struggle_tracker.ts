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

export class StruggleTracker {
  private consecutiveFailures = 0;

  /**
   * Called after each turn with the LLM's assessment of student progress.
   * Returns a StruggleRecommendation if threshold is exceeded.
   *
   * IMPORTANT: The recommendation must be sent to the dashboard for
   * teacher review. It must NOT be auto-executed by the orchestrator.
   */
  evaluateTurn(
    progressDetected: boolean,
    threshold: number,
    fallbackPolicy: 'offer_hint' | 'direct_correction' | 'step_back',
    barrier?: string
  ): StruggleRecommendation | null {
    if (progressDetected) {
      this.consecutiveFailures = 0;
      return null;
    }

    this.consecutiveFailures++;

    if (this.consecutiveFailures >= threshold) {
      return {
        type: 'struggle_recommendation',
        requiresTeacherConfirmation: true,
        recommendedAction: fallbackPolicy,
        consecutiveTurnsWithoutProgress: this.consecutiveFailures,
        identifiedBarrier: barrier,
        is_formative_only: true,
      };
    }

    return null;
  }

  reset(): void {
    this.consecutiveFailures = 0;
  }
}
