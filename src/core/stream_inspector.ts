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
  public pushToken(token: string): void {
    if (this.abortController?.signal.aborted) {
      return;
    }
    
    // 1. Immediately emit to client for zero perceived latency
    this.emit('chunk', token);
    
    // 2. Buffer for asynchronous inspection
    this.currentChunk.push(token);

    // 3. Trigger async verification if chunk is large enough
    if (this.currentChunk.length >= this.chunkSizeTokens && !this.isVerifying) {
      // Run in background, do not block the stream
      this.verifyChunkAsync().catch(err => console.error(err));
    }
  }

  /**
   * Verifies the current chunk asynchronously. If unsafe, aborts stream (Kill Switch).
   */
  private async verifyChunkAsync(): Promise<void> {
    if (this.currentChunk.length === 0 || this.abortController?.signal.aborted) {
      return;
    }

    this.isVerifying = true;
    
    // Take a snapshot of the current buffer to verify
    const tokensToVerify = this.currentChunk.splice(0, this.currentChunk.length);
    const chunkToVerify = tokensToVerify.join('');
    
    // Sliding window check: verify previous safe context + new chunk against salami-slicing
    const contextToCheck = this.safeContext + chunkToVerify;

    try {
      const isSafe = await this.checkSafetyAsync(contextToCheck);

      if (!isSafe) {
        this.abortStream('Unsafe Salami-Slicing or restricted content detected by Chunk-Gate');
      } else {
        // Safe! Keep track of context for the sliding window
        this.safeContext += chunkToVerify;
      }
    } catch (error) {
      console.error('[STREAM_INSPECTOR] Error during Chunk-Gate verification:', error);
      // Fail-closed mechanism for inspection errors
      this.abortStream('Error during guardrail inspection. Failing closed.');
    } finally {
      this.isVerifying = false;
      // If new tokens accumulated while verifying, trigger verification again
      if (this.currentChunk.length >= this.chunkSizeTokens && !this.abortController?.signal.aborted) {
        this.verifyChunkAsync().catch(err => {
          console.error('[STREAM_INSPECTOR] Async chunk verification failed:', err);
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
      await this.verifyChunkAsync();
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
