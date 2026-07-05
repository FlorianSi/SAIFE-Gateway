import RE2 from 're2';

export class InputSanitizer {
  private static ledgerRegex = new RE2(/\[SAFETY_LEDGER\]/gi);
  private static topicsStartRegex = new RE2(/<focus_topics>/gi);
  private static topicsEndRegex = new RE2(/<\/focus_topics>/gi);

  public static sanitize(input: string): string {
    let safeInput = input;
    // Strip [SAFETY_LEDGER] completely
    safeInput = safeInput.replace(this.ledgerRegex, '');
    // Strip <focus_topics> completely
    safeInput = safeInput.replace(this.topicsStartRegex, '');
    // Strip </focus_topics> completely
    safeInput = safeInput.replace(this.topicsEndRegex, '');
    
    return safeInput;
  }
}
