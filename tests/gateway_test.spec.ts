import * as crypto from 'crypto';
import { StreamInspector } from '../src/core/stream_inspector';
import { PreflightGate } from '../src/core/preflight_gate';
import { PolicyVerifier } from '../src/security/policy_verifier';
import { MockGuardEngine, MockLLMService, MockTelemetryDispatcher } from './mock_services';

describe('Component 5: Test & Evaluation Suite (SAIFE Gateway)', () => {
  let mockGuardEngine: MockGuardEngine;
  let mockLLM: MockLLMService;
  let telemetry: MockTelemetryDispatcher;

  beforeEach(() => {
    mockGuardEngine = new MockGuardEngine();
    mockLLM = new MockLLMService();
    telemetry = new MockTelemetryDispatcher();
  });

  describe('1. Salami-Slicing against Chunk-Gate', () => {
    it('should detect and abort when adversarial payload is sliced across multiple chunks', async () => {
      const inspector = new StreamInspector({ chunkSizeTokens: 2 });
      const abortController = new AbortController();
      inspector.start(abortController);

      // Inject the MockGuardEngine logic into the StreamInspector
      (inspector as any).checkSafetyAsync = async (context: string) => {
        return await mockGuardEngine.evaluateContext(context);
      };

      const tokens = ['re', 'strict', 'ed', '_un', 'safe', '_phrase'];
      
      let aborted = false;
      inspector.on('unsafe_abort', () => {
        aborted = true;
      });

      for (const token of tokens) {
        if (abortController.signal.aborted) break;
        await inspector.pushTokenAsync(token);
      }
      
      await inspector.flushAsync();

      expect(aborted).toBe(true);
      expect(abortController.signal.aborted).toBe(true);
    });
  });

  describe('2. Soft-Alert single emission without state', () => {
    it('should emit a soft alert but maintain no state across requests', async () => {
      const gate = new PreflightGate();
      
      // First request: Soft Alert trigger
      const res1 = await gate.analyze("I am feeling very sad today");
      expect(res1.isSoftAlert).toBe(true);
      expect(res1.isHardAlert).toBe(false);

      // Second request: Benign
      const res2 = await gate.analyze("What is the weather like?");
      expect(res2.isSoftAlert).toBe(false);
      expect(res2.isHardAlert).toBe(false);

      // Assert that state did not carry over
      expect(res1.confidenceScore).toBeGreaterThan(0);
      expect(res2.confidenceScore).toBe(0);
    });
  });

  describe('3. Layer 1 invalid signature -> Fail-Closed', () => {
    it('should strictly block and fail-closed when policy signature is invalid', () => {
      // Generate a valid ED25519 keypair
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
      const ministryKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
      
      const verifier = new PolicyVerifier(ministryKeyPem, telemetry);
      
      // Forge a JWT with a valid header and payload but invalid signature
      const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ jti: '123', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
      const fakeSignature = Buffer.from('fake-signature-bytes').toString('base64url');
      
      const forgedJwt = `${header}.${payload}.${fakeSignature}`;
      
      expect(() => verifier.verifyPolicy(forgedJwt)).toThrow('Invalid policy signature. Execution strictly blocked.');
      
      const criticalEvents = telemetry.events.filter(e => e.priority === 'critical');
      expect(criticalEvents.length).toBeGreaterThan(0);
      expect(criticalEvents[0].eventName).toBe('SystemBlocked_InvalidSignature');
    });
  });

  describe('4. Layer 1 12-hour TTL expiration -> Fail-Closed', () => {
    it('should allow execution within fallback TTL but fail-closed after 12 hours without CRL', () => {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
      const ministryKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
      const verifier = new PolicyVerifier(ministryKeyPem, telemetry);

      // Mock Date.now
      const originalDateNow = Date.now;
      let currentTime = 1000000000000;
      global.Date.now = jest.fn(() => currentTime);

      // Create valid JWT
      const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ jti: 'test-jti', exp: Math.floor(currentTime / 1000) + 1000000 })).toString('base64url');
      
      // Sign correctly
      const sign = crypto.createSign('sha512');
      sign.update(`${header}.${payload}`);
      const signature = sign.sign(privateKey).toString('base64url');
      
      const validJwt = `${header}.${payload}.${signature}`;

      // Update CRL (valid)
      verifier.updateCrl({ revokedJtis: [], nextUpdate: currentTime + 3600000 });
      
      // First verification (CRL valid)
      expect(() => verifier.verifyPolicy(validJwt)).not.toThrow();

      // Simulate network loss and time jump (stale CRL)
      // Advance by 11 hours (within 12-hour fallback TTL)
      currentTime += 11 * 60 * 60 * 1000;
      
      // Should still verify due to Graceful Degradation
      expect(() => verifier.verifyPolicy(validJwt)).not.toThrow();

      // Advance past 12-hour fallback TTL
      currentTime += 2 * 60 * 60 * 1000; // Total 13 hours
      
      // Should fail-closed
      expect(() => verifier.verifyPolicy(validJwt)).toThrow('Fallback grace period expired. Execution explicitly blocked.');
      
      // Restore Date.now
      global.Date.now = originalDateNow;
    });
  });

  describe('5. Guard-Engine offline -> Fail-Closed (and authorized Degraded Mode)', () => {
    it('should abort stream and fail-closed when Guard-Engine goes offline during Chunk-Gate verification', async () => {
      const inspector = new StreamInspector({ chunkSizeTokens: 2 });
      const abortController = new AbortController();
      inspector.start(abortController);

      // Inject the GuardEngine logic into StreamInspector
      (inspector as any).checkSafetyAsync = async (context: string) => {
        return await mockGuardEngine.evaluateContext(context);
      };

      // Simulate Guard-Engine offline
      mockGuardEngine.isOnline = false;

      let aborted = false;
      inspector.on('unsafe_abort', (reason) => {
        aborted = true;
        expect(reason).toBe('Error during guardrail inspection. Failing closed.');
      });

      // Push tokens
      await inspector.pushTokenAsync('Hello ');
      await inspector.pushTokenAsync('world'); // Triggers check

      expect(aborted).toBe(true);
      expect(abortController.signal.aborted).toBe(true);
    });
  });

  describe('6. Homoglyph normalization', () => {
    it('should normalize homoglyphs and flag adversarial inputs attempting to bypass filters', async () => {
      const gate = new PreflightGate();
      
      // 'Ñ•' is a Cyrillic homoglyph for 's'
      // By replacing 's' with 'Ñ•' in 'suicide', an attacker might bypass naive filters.
      const adversarialInput = "I want to commit Ñ•uicide";
      
      const result = await gate.analyze(adversarialInput);
      
      // This test is expected to fail if Component 1 (PreflightGate) is flawed
      // A robust system should normalize the homoglyph and flag it as a hard alert.
      expect(result.isHardAlert).toBe(true);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.8);
    });
  });
});
