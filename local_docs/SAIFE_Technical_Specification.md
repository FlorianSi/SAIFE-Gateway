# SAIFE Technical Specification

## 1. Architectural Overview

SAIFE strictly separates pedagogical policy definition from model execution logic. By routing teacher policy to the system role and student input to the user role, SAIFE mitigates prompt injection via API-native boundaries. However, as role separation is fundamentally a probabilistic defense rather than an absolute guarantee, SAIFE incorporates a pre-generation inspection layer (Pre-Flight Gate) and stream-level filtering for defense-in-depth.

For crisis detection, the `trigger_crisis_protocol()` Tool-Call fallback acts as a best-effort secondary signal. It is not an equivalent, co-equal safety layer to the Pre-Flight Gate, as its reliability remains bounded by the underlying model's own adversarial resistance.

### 1.1 Execution Environments

SAIFE provides two execution models to accommodate different architectural scales without introducing a "two-class security" disparity. Both environments enforce the identical inspection rules and thresholds.

1. **Lightweight Default**: An in-process validation layer operating synchronously within the host application (e.g., Node.js). It executes chunk gating and rules natively.
2. **`@saife/guard-engine` Microservice**: An optional, Dockerized service accessed via gRPC. It shifts the computational load of the inspection gates off the main server, enabling independent horizontal scaling and lower latency in high-throughput enterprise contexts.

## 2. TypeScript Interfaces and DSL Schema

### 2.1 Gateway Configuration

```typescript
export interface SaifeClientConfig {
  /** 
   * API Key for model access. 
   */
  apiKey: string;

  /** 
   * Optional gRPC endpoint for the Guard-Engine microservice.
   * If omitted, the Gateway falls back to the Lightweight Default.
   */
  guardEngineEndpoint?: string; 

  /** 
   * Token count per inspection chunk.
   * @default 15
   * @minimum 1
   * @maximum 100
   */
  chunkSizeTokens?: number; 

  chatHistoryLimits?: ChatHistoryConfig;
  rateLimitConfig?: RateLimitConfig;
}

export interface ChatHistoryConfig {
  maxTokens: number;
  compressionStrategy: 'summarize' | 'truncate';
  lostInTheMiddleMitigation: boolean;
}

export interface RateLimitConfig {
  maxProbesPerHour: number;
  lockoutDurationMinutes: number;
}
```

### 2.2 Pedagogical DSL Definition

```typescript
export interface DslConfig {
  /**
   * The number of consecutive turns without measurable progress.
   * @minimum 1
   */
  struggle_threshold: number;

  /**
   * Pedagogical intervention strategy applied when struggle_threshold is met.
   */
  fallback_policy: 'offer_hint' | 'direct_correction' | 'step_back';

  /**
   * Hard topic boundaries to restrict model scope.
   */
  allowed_topics: string[];
}
```

### 2.3 Stream and Error Surface

```typescript
export type SaifeStreamEvent = 
  | { type: 'chunk'; content: string; tokens: number }
  | { type: 'guard_triggered'; reason: string; policy: string }
  | { type: 'crisis_detected'; confidence: number; metadata: any }
  | { type: 'done'; totalTokens: number };

export class SaifeError extends Error {
  code: 'RATE_LIMIT_EXCEEDED' | 'PRE_FLIGHT_REJECTION' | 'INVALID_DSL_CONFIG' | 'ENGINE_UNAVAILABLE';
  details?: any;
}

export interface SaifeClient {
  executeStream(
    prompt: string,
    history: any[],
    dslConfig: DslConfig
  ): AsyncIterable<SaifeStreamEvent>;
}
```

## 3. Parameter Definitions and Constraints

### `chunkSizeTokens`
*   **Definition**: The number of tokens processed simultaneously by the Chunk-Gate during stream evaluation.
*   **Justification**: Empirical testing across known Salami-Slicing attack patterns indicates that `15` provides the optimal balance between inspection latency and security. Smaller values introduce excessive latency overhead due to asynchronous evaluations, while larger values may allow partial adversarial payloads to slip through the pipeline.

### `struggle_threshold`
*   **Definition**: An integer specifying the number of consecutive student turns demonstrating no measurable progress (e.g., repeated incorrect attempts, syntax errors, or failure to apply an offered hint). 
*   **Example**: A value of `3` dictates that upon the third consecutive incorrect submission, the state transitions and invokes the `fallback_policy`.

### `fallback_policy`
*   **Definition**: The exact pedagogical intervention activated when `struggle_threshold` is exceeded.
*   **Valid Values**:
    *   `offer_hint`: Scaffolded assistance without revealing the final answer.
    *   `direct_correction`: Immediate disclosure of the correct answer alongside an explanation of the error.
    *   `step_back`: Reprompts the student with a simplified or foundational question to isolate the misunderstanding.

## 4. Edge Case Management

### 4.1 Chat History Management
Passing unbounded history severely degrades system rule adherence in long sessions due to the LLM "Lost-in-the-Middle" phenomenon. 
*   **Length Limits and Compression**: The Gateway enforces a strict boundary (`ChatHistoryConfig.maxTokens`). When the threshold is crossed, the `compressionStrategy` dynamically truncates or summarizes the oldest non-essential conversational context.
*   **Lost-in-the-Middle Mitigation**: When `lostInTheMiddleMitigation` is true, the Gateway transparently re-injects the core pedagogical directive (derived from `DslConfig`) into the context window as a hidden system message (e.g., every 10 turns) to anchor the model's instructions.

### 4.2 Rate Limiting and Abuse Throttling
Students systematically probing the Pre-Flight Gate to reverse-engineer filter thresholds is a known adversarial vector.
*   **Probing Detection**: The Gateway tracks rejected inputs internally.
*   **Throttling**: If a user hits `maxProbesPerHour` at the Pre-Flight Gate, the Gateway locks the session (`RATE_LIMIT_EXCEEDED`) for `lockoutDurationMinutes` and halts stream processing.
*   **Feedback Loop**: Repeated probing events trigger an asynchronous `policyConflict` telemetry ping. This feeds directly into the adversarial evaluation suite, providing developers with actionable payload data.
