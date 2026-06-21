/**
 * Pre-Flight Gate for evaluating user input before LLM processing.
 * Classifies input for potential crisis alerts.
 */

export interface PreflightResult {
  isHardAlert: boolean;
  isSoftAlert: boolean;
  confidenceScore: number;
  reason: string | null;
}

export class PreflightGate {
  private static readonly HARD_ALERT_THRESHOLD = 0.8;
  private static readonly SOFT_ALERT_THRESHOLD = 0.3;
  private static readonly MAX_INPUT_LENGTH = 4096;

  /**
   * Analyzes input text to calculate a confidence score for crisis detection.
   * @param input Raw user input string
   * @returns Promise resolving to PreflightResult
   */
  public async analyze(input: string): Promise<PreflightResult> {
    if (typeof input !== 'string') {
      throw new TypeError('Invalid input provided to PreflightGate');
    }

    // 1. Perimeter Defense: Pre-normalization length check (prevent CPU exhaustion)
    if (input.length > PreflightGate.MAX_INPUT_LENGTH) {
      throw new Error(`Input exceeds maximum allowed length of ${PreflightGate.MAX_INPUT_LENGTH} characters.`);
    }

    // 2. NFKC Normalization to mitigate homoglyph and leet-speak bypasses
    const normalizedInput = input.normalize('NFKC');

    // 3. Post-normalization length check (prevent buffer expansion attacks)
    if (normalizedInput.length > PreflightGate.MAX_INPUT_LENGTH) {
      throw new Error('Normalized input exceeds maximum allowed length.');
    }

    const confidenceScore = await this.computeConfidence(normalizedInput);

    return {
      isHardAlert: confidenceScore >= PreflightGate.HARD_ALERT_THRESHOLD,
      isSoftAlert: confidenceScore >= PreflightGate.SOFT_ALERT_THRESHOLD && 
                   confidenceScore < PreflightGate.HARD_ALERT_THRESHOLD,
      confidenceScore,
      reason: confidenceScore >= PreflightGate.SOFT_ALERT_THRESHOLD 
              ? 'Potential crisis detected by preflight analysis' 
              : null,
    };
  }

  /**
   * Simulates confidence score computation.
   * In a real environment, this should call an optimized model.
   */
  private async computeConfidence(input: string): Promise<number> {
    const lowerInput = input.toLowerCase();
    
    // Expanded regex matching to catch variations and spaces
    const hardCrisisRegex = /(suicide|kill\s*myself|end\s*my\s*life|unalive)/;
    if (hardCrisisRegex.test(lowerInput)) {
      return 0.95;
    } 
    
    const softCrisisRegex = /(depressed|sad|hopeless|give\s*up)/;
    if (softCrisisRegex.test(lowerInput)) {
      return 0.40;
    }

    return 0.0;
  }
}
