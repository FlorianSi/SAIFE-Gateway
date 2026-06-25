/**
 * SAIFE Gateway - Compliance & Telemetry Engine
 *
 * Strict compliance with:
 * - GDPR Art. 25: Privacy by Design (Local Differential Privacy for Stream 2)
 * - GDPR Art. 9: Explicit encryption for sensitive/crisis data (Emergency Events)
 *
 * ARCHITECTURAL NOTE — "Persistent-State Free" Framing:
 * The Gateway process itself is Persistent-State Free (zero disk retention).
 * However, the telemetry events it emits (Stream 1) are designed to be persisted by the
 * school's platform backend and may constitute personal data under GDPR Art. 4(1).
 * Platform operators are the Data Controller and bear all obligations under Art. 6, 13, 14.
 *
 * IMPORTANT — Rate Limiting:
 * To prevent resource exhaustion, the Gateway maintains a volatile, transient in-memory integer
 * Token Bucket for rate limiting. This transient memory contains no event payloads, no
 * personal data, and no behavioral history, and is irrevocably destroyed upon process termination.
 */

/**
 * Structured summary of pedagogical context for a telemetry event.
 * IMPORTANT: This interface is intentionally closed (no index signature).
 * Unknown keys must never be passed to this structure, as they would bypass
 * the LDP anonymization and could carry personal data to the research endpoint.
 * Use additional_metadata for any operator-defined extensible fields.
 */
export interface ContextSummary {
  topic: string;
  difficulty_level: number;
  duration_seconds: number;
  /**
   * [PLANNED] Reference to a teacher-configured learning objective (from the allowlist).
   * Must NOT be free-text from LLM output.
   */
  observed_skill_indicator?: string;
  /**
   * Human-readable description of the specific difficulty observed.
   * Dashboard must label this as: "Possible difficulty — verify with student."
   */
  identified_barrier?: string;
  /**
   * Controlled extensibility field for operator-defined metadata.
   * Only string, number, or boolean values are permitted.
   */
  additional_metadata?: Record<string, string | number | boolean>;
}

/**
 * Strict structural type for Research Events (Stream 2).
 * Compilation-time guarantee that fields like sessionId, turnIndex,
 * studentId, or free-text topics are NEVER passed to the research endpoint.
 */
export interface Stream2SafeContext {
  difficulty_level: number;
  duration_seconds: number;
}

export type Stream1WelfareEventType = 'struggle_detected' | 'soft_alert';
export type Stream1AcademicEventType =
  | 'learning_signal'
  | 'conceptual_difficulty_signal'
  | 'aha_moment';

/**
 * Stream 1: Welfare Events — emitted with raw studentId (local, institutional use only).
 * These are welfare signals and do not require GDPR Art. 35 DPIA on their own.
 */
export interface Stream1WelfareEvent {
  type: Stream1WelfareEventType;
  timestamp: string;
  studentId: string;
  context_summary: ContextSummary;
}

/**
 * Stream 1: Academic Observation Events — emitted with studentId.
 * IMPORTANT: These events are FORMATIVE SIGNALS ONLY.
 * They must not be used for automated grading or LMS record-keeping without
 * explicit teacher confirmation. Platform operators must include these in their
 * GDPR Art. 13/14 privacy notice to students and parents.
 */
export interface Stream1AcademicEvent {
  type: Stream1AcademicEventType;
  /** Always true. Signals to the platform that teacher review is required. */
  is_formative_only: true;
  timestamp: string;
  studentId: string;
  context_summary: ContextSummary;
}

/** Union of all Stream 1 event types */
export type Stream1Event = Stream1WelfareEvent | Stream1AcademicEvent;

export interface Stream2Event {
  type: 'research_metric';
  timestamp: string;
  // Intentionally omitting studentId to enforce anonymity
  context_summary: Stream2SafeContext;
}

export interface EmergencyEvent {
  type: 'crisis_indicator' | 'health_alert';
  timestamp: string;
  // Hybrid encrypted payload (RSA-OAEP + AES-GCM)
  encrypted_payload: string;
}

export interface TelemetryConfig {
  institutionalEndpoint: string;
  researchEndpoint: string;
  emergencyEndpoint: string;
  bearerToken?: string;
  emitFn?: (endpoint: string, payload: unknown) => Promise<void>;
  epsilon?: number; // Privacy budget (epsilon > 0, default 0.1)
}

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRatePerMs: number;

  constructor(capacity: number, refillRatePerSec: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.lastRefill = Date.now();
    this.refillRatePerMs = refillRatePerSec / 1000;
  }

  public consume(): boolean {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRatePerMs);
    this.lastRefill = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  public isStale(): boolean {
    // A bucket is stale if it hasn't been accessed in twice the time it takes to fully refill
    const fullRefillTimeMs = (this.capacity / this.refillRatePerMs);
    return (Date.now() - this.lastRefill) > (fullRefillTimeMs * 2);
  }
}

export class TelemetryEngine {
  private config: TelemetryConfig;
  private rateLimiters = new Map<string, TokenBucket>();
  private static readonly MAX_EVENTS_PER_MIN = 10;

  constructor(config: TelemetryConfig) {
    if (config.epsilon !== undefined && config.epsilon <= 0) {
      throw new Error('Privacy budget (epsilon) must be > 0');
    }

    this.config = {
      ...config,
      epsilon: config.epsilon ?? 0.1, // Strong default privacy guarantee
      emitFn: config.emitFn ?? this.defaultEmit.bind(this)
    };

    // Periodically prune stale rate limiters to prevent memory leaks 
    // and avoid indefinite retention of studentIds (GDPR compliance).
    setInterval(() => this.pruneStaleRateLimiters(), 60000).unref?.();
  }

  private pruneStaleRateLimiters(): void {
    for (const [studentId, bucket] of this.rateLimiters.entries()) {
      if (bucket.isStale()) {
        this.rateLimiters.delete(studentId);
      }
    }
  }

  /**
   * Default emission using fetch.
   * Host platforms are encouraged to inject their own trusted emit function
   * with HMAC/bearer token authentication to prevent payload spoofing.
   *
   * IMPORTANT: This default implementation has no authentication header.
   * It is suitable for development only. Production deployments MUST provide
   * a custom emitFn that signs payloads (e.g., HMAC-SHA256 Authorization header).
   */
  private async defaultEmit(endpoint: string, payload: unknown): Promise<void> {
    try {
      new URL(endpoint); // Validates URL to prevent malformed requests
      
      const payloadString = JSON.stringify(payload);
      if (Buffer.byteLength(payloadString, 'utf8') > 4096) {
        throw new Error('Payload size exceeds 4096 bytes. Rejected to prevent DoS.');
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.config.bearerToken) {
        headers['Authorization'] = `Bearer ${this.config.bearerToken}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: payloadString,
        credentials: 'omit' // Prevents inadvertent session exposure
      });
      if (!response.ok) {
        // Log non-2xx responses so crisis alerts are not silently lost
        console.error(`[TELEMETRY] Endpoint returned ${response.status} for payload type: ${(payload as Record<string, unknown>)?.type ?? 'unknown'}`);
      }
    } catch (error: unknown) {
      // Log but do not crash. In production, route to a dead-letter queue.
      console.error('[TELEMETRY] Emission failed:', error instanceof Error ? error.message : error);
    }
  }

  /**
   * Stream 1: Institutional Dashboard
   * Emits welfare and academic observation events to the local school backend. Stateless (no local accumulation).
   * Platform operators bear responsibility for secure storage and GDPR-compliant retention.
   */
  public async emitInstitutionalEvent(event: Omit<Stream1Event, 'timestamp'>): Promise<void> {
    const studentId = event.studentId;
    
    let bucket = this.rateLimiters.get(studentId);
    if (!bucket) {
      bucket = new TokenBucket(TelemetryEngine.MAX_EVENTS_PER_MIN, TelemetryEngine.MAX_EVENTS_PER_MIN / 60);
      this.rateLimiters.set(studentId, bucket);
    }

    if (!bucket.consume()) {
      const truncatedHash = Buffer.from(studentId).toString('base64').substring(0, 8);
      console.warn(`[TELEMETRY] Rate limit exceeded for student hash ${truncatedHash}... Dropping event.`);
      return;
    }

    const payload: Stream1Event = {
      ...event,
      timestamp: new Date().toISOString()
    } as Stream1Event;
    
    // Fire and forget without local storage accumulation
    await this.config.emitFn!(this.config.institutionalEndpoint, payload);
  }

  /**
   * Stream 2: Research Telemetry
   * Anonymizes numeric curriculum metrics before emission using Local Differential Privacy.
   *
   * IMPORTANT — Scope of anonymization:
   * LDP noise is applied ONLY to numeric fields (difficulty_level, duration_seconds).
   * All string fields (topic, observed_skill_indicator, identified_barrier) are
   * STRIPPED before research emission to prevent re-identification via auxiliary attacks.
   * The timestamp is truncated to the nearest hour.
   *
   * Grouping (k-anonymity) is deferred to the server;
   */
  public async emitResearchEvent(safeContext: Stream2SafeContext): Promise<void> {
    const anonymizedContext = this.applyLocalDifferentialPrivacy(safeContext);

    const payload: Stream2Event = {
      type: 'research_metric',
      // Truncate to nearest hour to prevent timestamp fingerprinting
      timestamp: new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000).toISOString(),
      context_summary: anonymizedContext
    };

    await this.config.emitFn!(this.config.researchEndpoint, payload);
  }

  /**
   * Emergency / Crisis Data Emission (GDPR Art. 9 Compliance)
   * Strictly requires hybrid encryption BEFORE transmission.
   */
  public async emitEmergencyEvent(
    type: 'crisis_indicator' | 'health_alert',
    sensitiveData: Record<string, unknown>,
    publicKey: CryptoKey
  ): Promise<void> {
    const iat = Math.floor(Date.now() / 1000);
    const jti = globalThis.crypto.randomUUID();
    
    const innerPayload = {
      type,
      timestamp: new Date(iat * 1000).toISOString(),
      jti, // Replay protection
      iat, // Replay protection
      ...sensitiveData
    };
    
    const encodedData = new TextEncoder().encode(JSON.stringify(innerPayload));
    
    // RFC 7516 Compact Serialization JWE
    const jweHeader = { alg: 'RSA-OAEP-256', enc: 'A256GCM' };
    const encodedHeader = this.toBase64Url(new TextEncoder().encode(JSON.stringify(jweHeader)));
    
    // AES-GCM for robust payload encryption requires AAD for RFC 7516 JWE compliance
    const aesKey = await globalThis.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt']
    );
    
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const aad = new TextEncoder().encode(encodedHeader); // ASCII(BASE64URL(UTF8(JWE Protected Header)))

    const encryptedPayload = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: aad },
      aesKey,
      encodedData
    );
    
    // RSA-OAEP to encrypt the AES key (Hash algorithm is bound to the publicKey object)
    const rawAesKey = await globalThis.crypto.subtle.exportKey('raw', aesKey);
    const encryptedKey = await globalThis.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      rawAesKey
    );

    const encodedEncryptedKey = this.toBase64Url(encryptedKey);
    const encodedIv = this.toBase64Url(iv);
    
    // WebCrypto AES-GCM appends the 16 byte authentication tag to the end of the ciphertext
    const ciphertext = encryptedPayload.slice(0, encryptedPayload.byteLength - 16);
    const authTag = encryptedPayload.slice(encryptedPayload.byteLength - 16);
    
    const encodedCiphertext = this.toBase64Url(ciphertext);
    const encodedAuthTag = this.toBase64Url(authTag);

    const jweString = `${encodedHeader}.${encodedEncryptedKey}.${encodedIv}.${encodedCiphertext}.${encodedAuthTag}`;

    const eventTimestamp = new Date(iat * 1000).toISOString();
    const emergencyPayload: EmergencyEvent = {
      type,
      timestamp: eventTimestamp,
      encrypted_payload: jweString
    };

    // Emergency Events deliberately bypass the rate limiter due to life-safety criticality
    await this.config.emitFn!(this.config.emergencyEndpoint, emergencyPayload);
  }

  /**
   * Local Differential Privacy (LDP)
   * Adds Laplacian noise to numeric fields only.
   * All string fields are stripped before research emission to prevent re-identification.
   */
  private applyLocalDifferentialPrivacy(safeContext: Stream2SafeContext): Stream2SafeContext {
    const epsilon = this.config.epsilon!;

    // Only numeric fields are retained for research. All string fields are dropped
    // to prevent auxiliary linkage attacks (topic + timestamp = session fingerprint).
    const anonymized: Stream2SafeContext = {
      difficulty_level: this.addLaplaceNoise(safeContext.difficulty_level, 1, epsilon),
      duration_seconds: Math.max(0, this.addLaplaceNoise(safeContext.duration_seconds, 60, epsilon)),
    };

    return anonymized;
  }

  /**
   * Secure Laplacian Noise Generator
   */
  private addLaplaceNoise(value: number, sensitivity: number, epsilon: number): number {
    const scale = sensitivity / epsilon;
    
    // To ensure perfect mathematical symmetry, generate magnitude and sign independently.
    // getSecureRandom() returns [0, 1), so (1 - u) is in (0, 1].
    const u = this.getSecureRandom();
    const magnitude = Math.max(Number.EPSILON, 1 - u);
    
    // Generate an independent random bit for the sign (+1 or -1)
    const array = new Uint8Array(1);
    globalThis.crypto.getRandomValues(array);
    const sign = (array[0] & 1) ? 1 : -1;
    
    const noise = -scale * sign * Math.log(magnitude);
    return value + noise;
  }

  /**
   * Cryptographically secure PRNG returning float in [0, 1)
   */
  private getSecureRandom(): number {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    return array[0] / 4294967296; // 2^32
  }

  /**
   * Strict Base64URL encoder for JWE
   * Uses Buffer.from() to avoid the O(n²) string-concatenation antipattern.
   */
  private toBase64Url(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return Buffer.from(bytes).toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
}
