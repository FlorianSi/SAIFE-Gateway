/**
 * SAIFE Gateway - API Contracts
 * Cloud <-> Gateway Interaction Interfaces
 * 
 * Note to implementers: These interfaces define the data shape. 
 * Ensure robust runtime validation (e.g., using Zod) before processing
 * to mitigate injection attacks, enforce type boundaries, and prevent DoS 
 * via excessively large payloads.
 */

import { TeacherFocusDirective } from '../core/focus_directive';
import { StruggleRecommendation } from '../core/struggle_tracker';

// ==========================================
// LAYER 3: Didactic Configuration
// ==========================================

export type DidacticMode = 
  | 'socratic'
  | 'direct'
  | 'guided_discovery'
  | 'faded_worked_examples';

export type GhostwritingPolicy = 
  | 'strict'
  | 'allow_snippets'
  | 'allow_full_code'
  | 'pseudo_code_only';

export type FallbackPolicy = 
  | 'offer_hint'
  | 'direct_correction'
  | 'step_back';

/**
 * Defines the instructional parameters set by the teacher or LMS.
 * This determines HOW the AI should respond pedagogically.
 */
export interface DslConfig {
  didactic_mode: DidacticMode;
  ghostwriting_policy: GhostwritingPolicy;
  /** Action to take when the student exceeds the struggle_threshold */
  fallback_policy?: FallbackPolicy;
  /** Domains from which analogies should be drawn (e.g., ["sports", "music"]) */
  analogy_domains?: string[];
  /** Hard topic boundaries to restrict model scope. */
  allowed_topics?: string[];
  /**
   * Specific learning objectives for the current session.
   * These are used as the reference for any 'learning_signal' events and must be
   * validated as a closed allowlist — LLM output is never passed verbatim to telemetry.
   */
  learning_objectives?: string[];
  /**
   * The number of consecutive turns without measurable progress.
   * @minimum 1
   * Example: A value of 3 dictates that upon the third consecutive incorrect submission, the state transitions and invokes the fallback_policy.
   */
  struggle_threshold?: number;
}

// Alias for backwards compatibility with existing backend structures
export type DidacticContext = DslConfig;

// ==========================================
// LAYERS 1-2 & LAYER 4: Message Structures
// ==========================================

/**
 * Represents Layer 1 and Layer 2 context (Core System Prompts).
 */
export interface SystemMessage {
  role: 'system' | 'developer';
  content: string;
}

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image_url';
  image_url: {
    url: string; // Must enforce secure HTTPS or controlled Data URIs at runtime
  };
}

export type UserMessageContent = string | Array<TextContent | ImageContent>;

/**
 * Represents Layer 4 (User Input).
 */
export interface UserMessage {
  role: 'user';
  content: UserMessageContent;
  /** Metadata to track client state, CSRF tokens, or request IDs for security */
  metadata?: Record<string, unknown>;
}

export interface AssistantMessage {
  role: 'assistant';
  content: string;
}

export type ConversationMessage = UserMessage | AssistantMessage;

// ==========================================
// API REQUEST (Gateway -> Cloud)
// ==========================================

/**
 * The main payload sent from the SAIFE Gateway to the Cloud API.
 * Enforces a strict separation of concerns between System/Didactic context and User interaction.
 */
export interface SaifeApiRequest {
  /** Layer 1-2: Core system behavior */
  system_context: SystemMessage[];
  /** Layer 3: Pedagogical configuration */
  didactic_context: DidacticContext;
  /** Layer 4: The actual conversation history and user input */
  messages: ConversationMessage[];
  
  /** Teacher Focus Directives for this session (F2) */
  focusDirectives?: TeacherFocusDirective[];
  /** If the teacher confirmed a prior struggle recommendation, the fallback policy is applied */
  confirmedFallbackPolicy?: FallbackPolicy;

  /** LLM Provider Settings */
  model: string;
  temperature?: number;
  max_tokens?: number;
  /** Determines if response should be Server-Sent Events (SSE) or NDJSON */
  stream?: boolean;
}

// ==========================================
// API RESPONSE STREAMS (Cloud -> Gateway)
// ==========================================

/**
 * Represents a standard text token generation event.
 */
export interface StreamTokenEvent {
  type: 'token';
  payload: {
    text: string;
  };
}

/**
 * Telemetry events emitted when the AI observes specific student interaction patterns.
 *
 * IMPORTANT — Formative Signals Only:
 * All pedagogical event types ('learning_signal', 'conceptual_difficulty_signal', 'aha_moment')
 * are AI-assisted FORMATIVE observations. They are NOT verified assessments, grades, or
 * diagnostic conclusions. They must NEVER be written directly to a student's academic record
 * without explicit teacher review and confirmation.
 * See: is_formative_only flag below.
 *
 * NOTE — Planned Features:
 * 'learning_signal' and 'conceptual_difficulty_signal' require a PedagogicalObserver
 * implementation that is not yet present in this codebase. These types define the intended
 * data contract for a future implementation.
 */
export interface StreamTelemetryEvent {
  type: 'telemetry';
  payload: {
    /**
     * Event type taxonomy:
     * - 'struggle_detected'            : Student is showing signs of difficulty (welfare/support signal).
     * - 'struggle_recommendation'      : Advisory recommendation for the teacher to intervene.
     * - 'frustration_detected'         : Student exhibits frustration markers in interaction style.
     * - 'aha_moment'                   : Student self-reports or displays markers of sudden insight.
     * - 'idle'                         : No interaction for a configured period.
     * - 'learning_signal'              : [PLANNED] LLM observes interaction consistent with a configured
     *                                    learning objective. Formative only — requires teacher review.
     * - 'conceptual_difficulty_signal' : [PLANNED] LLM observes interaction suggesting a conceptual
     *                                    difficulty. Requires domain ontology for reliable detection.
     * - 'focus_progress'               : Progress made on a Teacher Focus Directive.
     * - 'focus_mastery_signal'         : Mastery of a Teacher Focus Directive achieved.
     */
    event_type:
      | 'struggle_detected'
      | 'struggle_recommendation'
      | 'frustration_detected'
      | 'aha_moment'
      | 'idle'
      | 'learning_signal'
      | 'conceptual_difficulty_signal'
      | 'focus_progress'
      | 'focus_mastery_signal';
    confidence: number;
    /**
     * Always true for all pedagogical observation events.
     * Signals to the receiving platform that this event must not be used
     * for automated grading, record-keeping, or assessment without teacher confirmation.
     */
    is_formative_only: true;
    metrics?: Record<string, number>;
    /** A brief summary of the context that led to this telemetry event */
    context_summary: string;
    /**
     * [PLANNED] Reference to a specific learning objective from DidacticContext.learning_objectives.
     * Must be validated against the configured objectives allowlist — never free-text from LLM.
     * Only populated for 'learning_signal' events.
     */
    observed_skill_indicator?: string;
    /**
     * A human-readable description of the specific difficulty observed.
     * For 'struggle_detected' and 'conceptual_difficulty_signal' events.
     * Dashboard label: "Possible difficulty — verify with student."
     */
    identified_barrier?: string;
  };
}

export interface LifelineOption {
  id: string;
  label: string;
  action_payload: Record<string, unknown>;
}

/**
 * Explicit frontend retraction events.
 * Used to interrupt standard streaming and trigger frontend UI overrides.
 */
export interface StreamRetractionEvent {
  type: 'retraction';
  payload: {
    /** 
     * 'stream_abort' - Force stop generation (e.g., safety violation, didactic pivot).
     * 'display_lifeline' - Pause and offer the student a hint or alternative path.
     */
    action: 'stream_abort' | 'display_lifeline';
    reason: string;
    /** The message to be displayed to the student in the UI */
    student_facing_message: string;
    lifeline_options?: LifelineOption[];
  };
}

/**
 * System-level stream status indicators.
 */
export interface StreamSystemEvent {
  type: 'system_status';
  payload: {
    status: 'processing' | 'done' | 'error';
    message?: string;
  };
}

export type SaifeStreamEvent = 
  | StreamTokenEvent 
  | StreamTelemetryEvent 
  | StreamRetractionEvent 
  | StreamSystemEvent;

// ==========================================
// GATEWAY CONFIGURATION & CLIENT
// ==========================================

export interface ChatHistoryConfig {
  maxTokens: number;
  compressionStrategy: 'summarize' | 'truncate';
  lostInTheMiddleMitigation: boolean;
}

export interface RateLimitConfig {
  maxProbesPerHour: number;
  lockoutDurationMinutes: number;
}

export interface SaifeClientConfig {
  /** API Key for model access. */
  apiKey: string;
  /** Optional gRPC endpoint for the Guard-Engine microservice. */
  guardEngineEndpoint?: string; 
  /** Token count per inspection chunk. @default 15 */
  chunkSizeTokens?: number; 
  chatHistoryLimits?: ChatHistoryConfig;
  rateLimitConfig?: RateLimitConfig;
}

export class SaifeError extends Error {
  code: 'RATE_LIMIT_EXCEEDED' | 'PRE_FLIGHT_REJECTION' | 'INVALID_DSL_CONFIG' | 'ENGINE_UNAVAILABLE';
  details?: any;
  
  constructor(code: 'RATE_LIMIT_EXCEEDED' | 'PRE_FLIGHT_REJECTION' | 'INVALID_DSL_CONFIG' | 'ENGINE_UNAVAILABLE', message: string, details?: any) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export interface SaifeClient {
  executeStream(
    prompt: string,
    history: any[],
    dslConfig: DslConfig
  ): AsyncIterable<SaifeStreamEvent>;
}
