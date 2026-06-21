/**
 * SAIFE Orchestrator: Combines Middleware & LLM Wrapper components.
 */

import { PreflightGate } from './preflight_gate';
import { PromptCompiler, PromptLayers } from './prompt_compiler';
import { StreamInspector } from './stream_inspector';
import { CrisisHandler } from './crisis_handler';
import { TelemetryEngine, ContextSummary } from '../telemetry/telemetry';

export interface OrchestratorOptions {
  quarantineSize?: number;
  verificationIntervalMs?: number;
  telemetryEngine?: TelemetryEngine;
}

export interface LLMMockResponse {
  tokens: string[];
  toolCalls?: { name: string; args: Record<string, unknown> }[];
  didacticViolations?: string[];
}

export class SaifeOrchestrator {
  private preflightGate: PreflightGate;
  private promptCompiler: PromptCompiler;
  private crisisHandler: CrisisHandler;
  private telemetryEngine?: TelemetryEngine;
  private options: OrchestratorOptions;

  constructor(options: OrchestratorOptions = {}) {
    this.preflightGate = new PreflightGate();
    this.promptCompiler = new PromptCompiler();
    this.crisisHandler = new CrisisHandler();
    this.telemetryEngine = options.telemetryEngine;
    this.options = options;
  }

  /**
   * Processes a user request through the SAIFE pipeline.
   */
  public async processRequest(
    studentId: string,
    contextSummary: ContextSummary,
    layers: PromptLayers, 
    mockLLM: () => Promise<LLMMockResponse>,
    encryptionKey?: CryptoKey // Required if emergency events need to be emitted
  ): Promise<void> {
    // 1. Pre-Flight Check
    const preflight = await this.preflightGate.analyze(layers.userInput);
    
    if (preflight.isHardAlert) {
      console.warn('[ORCHESTRATOR] Hard alert before generation. Blocking.');
      if (this.telemetryEngine && encryptionKey) {
        await this.telemetryEngine.emitEmergencyEvent('crisis_indicator', { reason: 'Preflight Hard Alert', inputSize: layers.userInput.length }, encryptionKey);
      }
      return;
    }

    if (preflight.isSoftAlert) {
      console.info(`[ORCHESTRATOR] Soft alert: ${preflight.reason}`);
      if (this.telemetryEngine) {
        await this.telemetryEngine.emitInstitutionalEvent({
          type: 'soft_alert',
          studentId,
          context_summary: contextSummary
        });
      }
    }

    // 2. Prompt Compilation
    const compiledMessages = this.promptCompiler.compile(layers);
    
    // Setup Streaming & Abort Control for this specific request
    const streamInspector = new StreamInspector({
      chunkSizeTokens: this.options.quarantineSize,
      // NOTE: verificationIntervalMs is not part of StreamInspectorOptions;
      // it is an OrchestratorOptions field reserved for future use.
    });
    
    const abortController = new AbortController();
    streamInspector.start(abortController);

    streamInspector.on('chunk', (chunk) => {
      // Stream chunks to output
      process.stdout.write(chunk);
    });

    streamInspector.on('unsafe_abort', (reason) => {
      console.error(`\n[ORCHESTRATOR] Stream aborted: ${reason}`);
    });

    try {
      // 3. Mock LLM Call execution
      const response = await mockLLM();

      // Separation of Concerns: Log Didactic Violations without blocking
      if (response.didacticViolations?.length) {
        if (this.telemetryEngine) {
          // Emit a conceptual difficulty or similar based on the violation
          await this.telemetryEngine.emitInstitutionalEvent({
            type: 'conceptual_difficulty_signal',
            is_formative_only: true,
            studentId,
            context_summary: {
              ...contextSummary,
              identified_barrier: response.didacticViolations.join(', ')
            }
          });
        }
      }

      // Hard-Interrupt Check
      if (response.toolCalls) {
        for (const tool of response.toolCalls) {
          if (this.crisisHandler.isCrisisToolCall(tool.name)) {
            const lifeline = this.crisisHandler.executeHardInterrupt(abortController);
            streamInspector.abortStream('Crisis protocol invoked by LLM');
            console.log(`\n[LIFELINE] ${lifeline}`);
            if (this.telemetryEngine && encryptionKey) {
              await this.telemetryEngine.emitEmergencyEvent('crisis_indicator', { reason: 'LLM Tool Invocation', tool: tool.name }, encryptionKey);
            }
            return;
          }
        }
      }

      // 4. Stream tokens through the inspector guardrail (Chunk-Gate)
      for (const token of response.tokens) {
        if (abortController.signal.aborted) break;
        // CRITICAL: must await pushTokenAsync to ensure the Chunk-Gate
        // verification fires before the next token is processed.
        await streamInspector.pushTokenAsync(token);
        // Simulate async streaming delay
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      await streamInspector.flushAsync();
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('\n[ORCHESTRATOR] Request was aborted.');
      } else {
        console.error('\n[ORCHESTRATOR] Unexpected error:', error);
      }
    } finally {
      streamInspector.stop();
      streamInspector.removeAllListeners();
    }
  }
}
