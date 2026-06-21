import * as crypto from 'crypto';

export interface TelemetryDispatcher {
  dispatch(eventName: string, payload: Record<string, unknown>, priority: 'low' | 'medium' | 'high' | 'critical'): void;
}

export interface CrlData {
  revokedJtis: Set<string>;
  nextUpdate: number; // Epoch timestamp in milliseconds
}

export interface CrlInput {
  revokedJtis: string[];
  nextUpdate: number; // Epoch timestamp in milliseconds
}

export class PolicyVerifier {
  // Graceful degradation window: 4 hours as mandated by Layer 1 Policy specs
  private static readonly FALLBACK_TTL_MS = 4 * 60 * 60 * 1000;

  private cachedPolicy: { 
    jwt: string; 
    payload: Record<string, unknown>; 
    lastVerifiedPerfClock: number; // Uses performance.now() to measure runtime
    lastVerifiedDate: number; // Uses Date.now() to measure wall-clock time
  } | null = null;
  
  private crl: CrlData | null = null;
  private readonly ministryPublicKey: crypto.KeyObject;
  private readonly telemetry: TelemetryDispatcher;
  private failClosedTimer: NodeJS.Timeout | null = null;
  
  // Rate-limiting for telemetry to prevent log flooding when verification server is down
  private lastStaleTelemetryPerfClock = -60000;

  constructor(ministryPublicKeyPem: string, telemetry: TelemetryDispatcher) {
    if (!ministryPublicKeyPem || typeof ministryPublicKeyPem !== 'string') {
      throw new Error('Ministry public key PEM string is required.');
    }
    if (!telemetry || typeof telemetry.dispatch !== 'function') {
      throw new Error('Valid TelemetryDispatcher instance is required.');
    }

    try {
      this.ministryPublicKey = crypto.createPublicKey({
        key: ministryPublicKeyPem,
        format: 'pem',
      });
      if (this.ministryPublicKey.asymmetricKeyType !== 'ed25519') {
        throw new Error('Public key must be of type Ed25519.');
      }
    } catch (error) {
      throw new Error(`Failed to initialize Ministry public key: ${(error as Error).message}`);
    }

    this.telemetry = telemetry;
  }

  /**
   * Updates the local CRL data to enable offline validation.
   */
  public updateCrl(crlInput: CrlInput): void {
    if (!crlInput || typeof crlInput.nextUpdate !== 'number' || !Array.isArray(crlInput.revokedJtis)) {
      throw new Error('Invalid CRL data format received.');
    }
    
    // Prevent prototype pollution and accelerate lookups
    const revokedSet = new Set<string>();
    for (const jti of crlInput.revokedJtis) {
      if (typeof jti === 'string') {
        revokedSet.add(jti);
      }
    }

    this.crl = {
      revokedJtis: revokedSet,
      nextUpdate: crlInput.nextUpdate,
    };

    this.telemetry.dispatch('CRL_Updated', { nextUpdate: crlInput.nextUpdate }, 'low');
    
    if (this.isCrlValid()) {
      this.clearFailClosedTimer();
    }
  }

  private isCrlValid(): boolean {
    // Relying solely on Date.now() is vulnerable to NTP manipulation.
    // If the system clock is set back, this could return true indefinitely.
    // However, since nextUpdate is an absolute timestamp, Date.now() is required,
    // but the fallback TTL logic below must also combine both clocks.
    return this.crl !== null && Date.now() <= this.crl.nextUpdate;
  }

  private clearFailClosedTimer(): void {
    if (this.failClosedTimer) {
      clearTimeout(this.failClosedTimer);
      this.failClosedTimer = null;
    }
  }

  private startFailClosedTimer(jti: string, ttlMs: number): void {
    this.clearFailClosedTimer();
    
    // Prevent Number overflow for setTimeout max 32-bit int (~24.8 days)
    const safeTtlMs = Math.min(ttlMs, 2147483647);
    
    this.failClosedTimer = setTimeout(() => {
      this.telemetry.dispatch('SystemBlocked_GracePeriodExpired', { jti }, 'critical');
      this.cachedPolicy = null; // Enforce fail-closed state
      // In a broader ecosystem context, an event would be emitted here to halt all processing.
    }, safeTtlMs);
    
    // Don't artificially keep the process alive
    this.failClosedTimer.unref();
  }

  /**
   * Cryptographically verifies the Ed25519 Layer 1 Policy JWT.
   * Features strict validation, CRL checks, and Graceful Degradation / Fallback capabilities.
   */
  public verifyPolicy(jwt: string): Record<string, unknown> {
    const now = Date.now();

    if (typeof jwt !== 'string' || !jwt.trim()) {
      throw new Error('Invalid JWT provided.');
    }

    const parts = jwt.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format. Must be composed of exactly 3 parts.');
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // 1. Strict Algorithm Check (Must precede signature check per RFC 7515)
    let header: Record<string, unknown>;
    try {
      header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    } catch {
      throw new Error('Malformed JWT header payload.');
    }

    if (header.alg !== 'EdDSA') {
      throw new Error(`Prohibited algorithm detected: ${header.alg}. EdDSA is strictly required.`);
    }

    // 2. Signature Verification
    const dataToVerify = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');
    let signatureBuffer: Buffer;
    
    try {
      signatureBuffer = Buffer.from(signatureB64, 'base64url');
    } catch {
      throw new Error('Invalid signature encoding format.');
    }

    const isSignatureValid = crypto.verify(
      null, // Deduces from key type (Ed25519)
      dataToVerify,
      this.ministryPublicKey,
      signatureBuffer
    );

    if (!isSignatureValid) {
      this.telemetry.dispatch(
        'SystemBlocked_InvalidSignature', 
        { error: 'Cryptographic verification failed for the provided JWT.' }, 
        'critical'
      );
      throw new Error('Invalid policy signature. Execution strictly blocked.');
    }

    // Safely parse payload
    let payload: Record<string, unknown>;
    try {
      // Create object with null prototype to avoid prototype pollution vectors
      const rawPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      if (typeof rawPayload !== 'object' || rawPayload === null || Array.isArray(rawPayload)) {
        throw new Error('Payload is not a valid root JSON object.');
      }
      payload = Object.assign(Object.create(null), rawPayload);
    } catch {
      throw new Error('Malformed JWT policy payload.');
    }

    // Strictly validate Expiration
    if (typeof payload.exp === 'number') {
      if (payload.exp * 1000 < now) {
        throw new Error('Policy JWT has reached its expiration time.');
      }
    } else {
      throw new Error('Policy JWT lacks an expiration (exp) claim.');
    }

    // Strictly validate JWT ID
    const jti = payload.jti;
    if (typeof jti !== 'string' || !jti) {
      throw new Error('Policy JWT lacks a valid identifier (jti) claim.');
    }

    // 3. CRL Validation & 4. Graceful Degradation Window
    if (this.isCrlValid()) {
      if (this.crl!.revokedJtis.has(jti)) {
        this.telemetry.dispatch('SystemBlocked_PolicyRevoked', { jti }, 'critical');
        throw new Error('Policy has been explicitly revoked. Execution blocked.');
      }
      
      // Policy is authentic, fresh, and not revoked
      this.cachedPolicy = { jwt, payload, lastVerifiedPerfClock: performance.now(), lastVerifiedDate: Date.now() };
      this.clearFailClosedTimer(); // Reset degradation timeline
      
      return payload;
    }

    // 5. Fallback execution due to CRL unavailability
    const currentPerfClock = performance.now();
    
    // Throttle the telemetry event to max 1 per minute to prevent DoS/log exhaustion
    if (currentPerfClock - this.lastStaleTelemetryPerfClock > 60000) {
      this.telemetry.dispatch(
        'SystemDegraded_PolicyStale', 
        { jti, reason: 'Local CRL dataset is unavailable or has expired.' }, 
        'high'
      );
      this.lastStaleTelemetryPerfClock = currentPerfClock;
    }

    if (this.cachedPolicy && this.cachedPolicy.jwt === jwt) {
      // Allow execution if within Fallback TTL
      // performance.now() pauses during sleep, so an attacker could sleep the system to stretch the grace period.
      // Date.now() is vulnerable to NTP manipulation (setting clock back).
      // Taking the maximum of both elapsed times securely bounds the grace period against both attacks.
      const elapsedPerf = currentPerfClock - this.cachedPolicy.lastVerifiedPerfClock;
      const elapsedDate = Date.now() - this.cachedPolicy.lastVerifiedDate;
      const elapsedSinceValid = Math.max(elapsedPerf, elapsedDate);
      
      const remainingTtlMs = PolicyVerifier.FALLBACK_TTL_MS - elapsedSinceValid;
      
      if (remainingTtlMs > 0) {
        // Enforce the fail-closed timer proactively
        if (!this.failClosedTimer) {
          this.startFailClosedTimer(jti, remainingTtlMs);
        }
        return payload;
      } else {
        // TTL exhausted -> Hard Stop
        this.telemetry.dispatch('SystemBlocked_GracePeriodExpired', { jti }, 'critical');
        this.cachedPolicy = null;
        throw new Error('Fallback grace period expired. Execution explicitly blocked.');
      }
    } else {
      // Untrusted previously, and no fresh CRL exists -> Hard Stop
      this.telemetry.dispatch('SystemBlocked_CannotVerifyNewPolicy', { jti }, 'critical');
      throw new Error('Refusing to verify new policy under stale CRL context.');
    }
  }
}
