/**
 * Stream Inspector implements the Chunk-Gate guardrail.
 * Answers are released in semantic segments (chunks). Each segment is verified
 * before it is emitted to the frontend, protecting against Salami-Slicing.
 */

import { EventEmitter } from 'events';

export interface StreamInspectorOptions {
  chunkSizeTokens?: number; // Size of chunk to verify before emitting
}

export class StreamInspector extends EventEmitter {
  private readonly chunkSizeTokens: number;
  
  private currentChunk: string[] = [];
  private safeContext = '';
  private abortController: AbortController | null = null;
  private isVerifying = false;

  constructor(options: StreamInspectorOptions = {}) {
    super();
    // Default to releasing 15 tokens at a time (approx. half a sentence)
    this.chunkSizeTokens = options.chunkSizeTokens ?? 15;
  }

  public start(abortController: AbortController): void {
    this.stop();
    this.abortController = abortController;
  }

  /**
   * Pushes a new token into the current chunk.
   * If the chunk reaches the target size, it is verified before emission.
   */
  public async pushTokenAsync(token: string): Promise<void> {
    if (this.abortController?.signal.aborted) {
      return;
    }
    
    this.currentChunk.push(token);

    if (this.currentChunk.length >= this.chunkSizeTokens && !this.isVerifying) {
      await this.verifyAndEmitChunk();
    }
  }

  /**
   * Verifies the current chunk. If safe, emits it. If unsafe, aborts stream.
   */
  private async verifyAndEmitChunk(): Promise<void> {
    if (this.currentChunk.length === 0 || this.abortController?.signal.aborted) {
      return;
    }

    this.isVerifying = true;
    
    // Extract tokens up to chunkSizeTokens (or all if flush is called and it's less)
    // Wait, if we are flushing, we want to verify everything left.
    // So we take everything currently in currentChunk, saving any newly pushed tokens.
    const tokensToVerify = this.currentChunk.splice(0, this.currentChunk.length);
    const chunkToVerify = tokensToVerify.join('');
    
    // Sliding window check: verify previous safe context + new chunk against salami-slicing
    const contextToCheck = this.safeContext + chunkToVerify;

    try {
      const isSafe = await this.checkSafetyAsync(contextToCheck);

      if (!isSafe) {
        this.abortStream('Unsafe Salami-Slicing or restricted content detected by Chunk-Gate');
      } else {
        // Safe! Emit the chunk
        this.safeContext += chunkToVerify;
        this.emit('chunk', chunkToVerify);
      }
    } catch (error) {
      console.error('[STREAM_INSPECTOR] Error during Chunk-Gate verification:', error);
      // Fail-closed mechanism for inspection errors
      this.abortStream('Error during guardrail inspection. Failing closed.');
    } finally {
      this.isVerifying = false;
      // If new tokens accumulated while verifying, trigger verification again
      if (this.currentChunk.length >= this.chunkSizeTokens && !this.abortController?.signal.aborted) {
        // Use setImmediate or promise to avoid deep recursion if we don't await
        process.nextTick(() => {
          this.verifyAndEmitChunk().catch(err => {
            console.error('[STREAM_INSPECTOR] Async chunk verification failed:', err);
          });
        });
      }
    }
  }

  /**
   * Flushes any remaining tokens in the buffer at stream end.
   */
  public async flushAsync(): Promise<void> {
    if (this.abortController?.signal.aborted) {
      this.currentChunk = [];
      return;
    }

    if (this.currentChunk.length > 0) {
      await this.verifyAndEmitChunk();
    }
    
    if (!this.abortController?.signal.aborted) {
      this.emit('end');
    }
  }

  /**
   * Immediately stops stream and discards unverified chunks.
   */
  public abortStream(reason?: string): void {
    if (this.abortController && !this.abortController.signal.aborted) {
      this.abortController.abort(reason);
    }
    this.currentChunk = [];
    this.emit('unsafe_abort', reason);
  }

  private async checkSafetyAsync(context: string): Promise<boolean> {
    // Simulated gRPC / Classifier check: evaluates semantic sliding window
    return !context.toLowerCase().includes('restricted_unsafe_phrase');
  }

  public stop(): void {
    this.currentChunk = [];
    this.safeContext = '';
    this.abortController = null;
    this.isVerifying = false;
  }
}
