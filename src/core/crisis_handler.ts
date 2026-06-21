/**
 * Crisis Handler responsible for Hard-Interrupts during an active emergency.
 */

export const LIFELINE_TEXT = "I noticed you might be going through a tough time, and I want to make sure you're safe. You don't have to carry this alone. Please consider talking to a teacher or your school counselor. If you are in immediate danger, you can reach the Crisis Lifeline at 988 or call 911.";

export class CrisisHandler {
  private readonly crisisToolNames = ['trigger_crisis_protocol', 'emergency_alert'];

  /**
   * Checks if the invoked tool is the crisis protocol.
   * @param toolName Name of the tool invoked by the LLM.
   */
  public isCrisisToolCall(toolName: string): boolean {
    return this.crisisToolNames.includes(toolName);
  }

  /**
   * Executes the Hard-Interrupt.
   * Aborts the stream and returns the legal lifeline text.
   * @param abortController The active stream's AbortController.
   */
  public executeHardInterrupt(abortController: AbortController): string {
    if (!abortController.signal.aborted) {
      abortController.abort('Crisis protocol triggered');
    }
    
    this.logCrisisEvent();
    return LIFELINE_TEXT;
  }

  private logCrisisEvent(): void {
    // Asynchronously log the hard-interrupt event
    setImmediate(() => {
      console.warn('[CRISIS_HANDLER] Hard-interrupt executed. Lifeline text served.');
    });
  }
}
