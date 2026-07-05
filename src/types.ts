export interface TlsConfig {
  cert: string;
  key: string;
  ca?: string;
}

export interface ProviderConfig {
  dpaExecuted: boolean;
  transferBasis: 'DPF' | 'SCC_TIA' | 'NONE';
  noTrainingClause: boolean;
  endpointRegion: 'EU' | 'OTHER';
  tiaAddressesEndpointIfOther?: boolean;
  temperature?: number; // Kept as added, documented in DECISIONS_LOG
  loggingEnabled?: boolean;
}

export interface SaifeClientConfig {
  apiKey: string;
  guardEngineEndpoint?: string; 
  tlsConfig?: TlsConfig;
  directiveSecret?: string;
  chunkSizeTokens?: number; 
  chatHistoryLimits?: ChatHistoryConfig;
  rateLimitConfig?: RateLimitConfig;
  sessionStore?: ISessionStore;
  focusTopics: Record<string, string>;
  redactionProvider?: IRedactionProvider;
  auditSink?: IAuditSink;
  crisisAlertTransport?: ICrisisAlertTransport;
  crisisStore?: ICrisisStore;
  telemetrySink?: ITelemetrySink;
  providerConfig?: ProviderConfig;
}

export interface ChatHistoryConfig {
  maxTokens: number;
  compressionStrategy: 'truncate';
  lostInTheMiddleMitigation: boolean;
}

export interface RateLimitConfig {
  basePenaltySeconds: number;
  maxPenaltySeconds: number;
  leakRateSeconds: number;
}

export interface DslConfig {
  struggle_threshold: number;
  fallback_policy: 'offer_hint' | 'direct_correction' | 'step_back';
}

export interface TeacherFocusDirective {
  directiveId: string;
  studentId: string;
  focusTopicId: string; 
  targetObjectiveIds?: string[];
  preferredStrategy?: 'repetition' | 'scaffolding' | 'alternative_explanation';
  createdAt: string;
  expiresAt: string; 
  createdBy: string;
  signature?: string;
}

export interface ExecutionContext {
  userId: string;
  sessionId: string;
  role: 'student' | 'teacher';
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string; 
}

export type SaifeStreamEvent = 
  | { type: 'chunk'; content: string; tokens: number }
  | { type: 'guard_triggered'; message: string }
  | { type: 'done'; totalTokens: number };

export class SaifeError extends Error {
  code: 'RATE_LIMIT_EXCEEDED' | 'PRE_FLIGHT_REJECTION' | 'INVALID_DSL_CONFIG' | 'ENGINE_UNAVAILABLE' | 'VALIDATION_ERROR' | 'CRISIS_ALERT_DELIVERY_FAILED';
  details?: Record<string, unknown>;
  constructor(code: SaifeError['code'], message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export interface CrisisEvent {
  userId: string;
  sessionId: string;
  timestamp: string;
  category: string;
}

export interface ICrisisStore {
  saveCrisisEvent(event: CrisisEvent): Promise<void>;
  exportUserData(userId: string): Promise<CrisisEvent[]>;
  deleteUserData(userId: string, allowExemptionDeletion?: boolean): Promise<void>;
  hasCategoryThisSession(sessionId: string, category: string): Promise<boolean>;
  evictExpiredRecords?(cutoffMs: number): Promise<void>;
}

export interface ISessionStore {
  getHistory(sessionId: string): Promise<ConversationMessage[]>;
  saveHistory(sessionId: string, messages: ConversationMessage[]): Promise<void>;
  addToPenaltyBucket(userId: string, seconds: number): Promise<void>;
  getPenalty(userId: string): Promise<number>;
  clearUserData(userId: string): Promise<void>;
  exportUserData(userId: string): Promise<any>;
  incrementSafetyRefusal(userId: string): Promise<number>;
  getSafetyRefusals(userId: string): Promise<number>;
  getRejectionCount(userId: string, date: string): Promise<number>;
  incrementRejectionCount(userId: string, date: string): Promise<number>;
  verifyTeacherRoster(teacherId: string, studentId: string): Promise<boolean>;
  clearDirectives(userId: string): Promise<void>;
  evictExpiredRecords?(historyCutoffMs: number, penaltyCutoffMs: number): Promise<void>;
}

export interface IRedactionProvider {
  redact(text: string): string;
}

export interface ITelemetrySink {
  logEvent(event: { type: string, count: number, categoryCode: string, userId?: string }): Promise<void>;
  evictExpiredRecords?(cutoffMs: number): Promise<void>;
  deleteUserData(userId: string): Promise<void>;
}

export interface IAuditSink {
  logEvent(event: any): Promise<void>;
  evictExpiredRecords?(cutoffMs: number): Promise<void>;
}

export interface ICrisisAlertTransport {
  sendAlert(payload: CrisisEvent): Promise<void>;
}

export interface SaifeClient {
  executeStream(
    ctx: ExecutionContext,
    prompt: string,
    dslConfig: DslConfig
  ): AsyncIterable<SaifeStreamEvent>;
  getHistory(ctx: ExecutionContext): Promise<ConversationMessage[]>;
  deleteUserData(userId: string): Promise<void>;
  exportUserData(userId: string): Promise<any>;
  grantExemption(teacherCtx: ExecutionContext, studentId: string): Promise<void>;
}
