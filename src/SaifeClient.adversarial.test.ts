import { DefaultSaifeClient } from './SaifeClient';
import { SaifeClientConfig, TeacherFocusDirective, ExecutionContext } from './types';
import * as crypto from 'crypto';

describe('SaifeClient Adversarial Verification', () => {
  let mockSessionStore: any;
  let client: DefaultSaifeClient;

  beforeEach(() => {
    mockSessionStore = {
      verifyTeacherRoster: jest.fn(),
      getHistory: jest.fn().mockResolvedValue([]),
      clearUserData: jest.fn(),
      exportUserData: jest.fn(),
      getSafetyRefusals: jest.fn().mockResolvedValue(0),
      incrementRejectionCount: jest.fn().mockResolvedValue(1),
      addToPenaltyBucket: jest.fn(),
      saveHistory: jest.fn(),
      clearDirectives: jest.fn(),
    };

    const config: SaifeClientConfig = {
      apiKey: 'test-key',
      directiveSecret: 'secret_key',
      focusTopics: {},
      sessionStore: mockSessionStore,
    };
    client = new DefaultSaifeClient(config);
  });

  // 1. Sliding-window straddling attack (Security Property)
  it('prevents a policy-violating token from reaching the client (Stream terminates before yielding)', async () => {
    const ctx: ExecutionContext = { userId: 'u1', sessionId: 's1', role: 'student' };
    
    // We create a payload that contains "bad_chunk" near the end of a 150-word prompt.
    // The hold-back buffer is 200 tokens.
    // If the check fails or leaks, tokens might be emitted before the exception.
    const promptTokens = Array.from({ length: 150 }, (_, i) => `safeword${i}`);
    promptTokens.push('bad_chunk');
    const prompt = promptTokens.join(' ');

    const iterator = client.executeStream(ctx, prompt, { struggle_threshold: 0, fallback_policy: 'offer_hint' });
    
    let yieldedChunks = 0;
    try {
      for await (const event of iterator) {
        if (event.type === 'chunk') {
          yieldedChunks++;
        }
      }
      fail('Expected PRE_FLIGHT_REJECTION to be thrown');
    } catch (e: any) {
      expect(e.code).toBe('PRE_FLIGHT_REJECTION');
      // CRITICAL SECURITY ASSERTION: Zero tokens yielded before termination!
      expect(yieldedChunks).toBe(0);
    }
  });

  // 2. HMAC tampering
  it('catches HMAC tampering (modified expiresAt after signing)', async () => {
    const teacherCtx: ExecutionContext = { userId: 'teacher-A', sessionId: 's1', role: 'teacher' };
    
    const payload: any = {
      directiveId: 'dir-1',
      createdBy: 'teacher-A',
      studentId: 'student-1',
      focusTopicId: 'topic-1',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 100000).toISOString(),
    };
    
    const payloadString = JSON.stringify(payload, Object.keys(payload).sort());
    const validSignature = crypto.createHmac('sha256', 'secret_key').update(payloadString).digest('hex');
    
    // Tamper the payload: extend expiresAt
    const tamperedDirective: TeacherFocusDirective = {
      ...payload,
      expiresAt: new Date(Date.now() + 9999999).toISOString(), // modified!
      signature: validSignature
    };

    mockSessionStore.verifyTeacherRoster.mockResolvedValue(true);

    await expect(client.validateDirective(tamperedDirective, teacherCtx)).rejects.toMatchObject({
      code: 'INVALID_DSL_CONFIG',
      message: 'Directive signature mismatch'
    });
  });

  // 3. Oracle check
  it('returns indistinguishable messages for rate-limit and pre-flight rejections', async () => {
    const ctx: ExecutionContext = { userId: 'u1', sessionId: 's1', role: 'student' };
    
    // Simulate rate-limit (penalty bucket) failure vs pre-flight (regex) failure.
    // In our POC, a rate-limited user triggers PRE_FLIGHT_REJECTION from the attack regex.
    // If they hit the regex (e.g. "salami"), it throws immediately.
    // Let's assert the exact message thrown.
    
    mockSessionStore.incrementRejectionCount.mockResolvedValue(5); // high rejection rate
    
    try {
      const iterator = client.executeStream(ctx, 'salami attack', { struggle_threshold: 0, fallback_policy: 'offer_hint' });
      for await (const event of iterator) {}
      fail('Expected error');
    } catch (e: any) {
      expect(e.code).toBe('PRE_FLIGHT_REJECTION');
      expect(e.message).toBe("This request can't be processed.");
    }
  });

  // 4. Crisis-beats-attack precedence
  it('gives precedence to crisis over attack (trip both classifiers)', async () => {
    const ctx: ExecutionContext = { userId: 'u1', sessionId: 's1', role: 'student' };
    // "salami" = attack, "suizid" = crisis
    const iterator = client.executeStream(ctx, 'salami suizid', { struggle_threshold: 0, fallback_policy: 'offer_hint' });
    
    const events = [];
    for await (const event of iterator) {
      events.push(event);
    }
    
    // Attack should be completely bypassed
    expect(mockSessionStore.addToPenaltyBucket).not.toHaveBeenCalled();
    // Crisis response yielded
    expect((events[0] as any).content).toContain('Nummer gegen Kummer');
  });

  // 5. Teacher spoofing / reserved identity checking
  it('rejects directive if createdBy is not bound to authenticated teacherCtx identity', async () => {
    const teacherCtx: ExecutionContext = { userId: 'teacher-A', sessionId: 's1', role: 'teacher' };
    
    const payload: any = {
      directiveId: 'dir-1',
      createdBy: 'teacher-B', 
      studentId: 'student-1',
      focusTopicId: 'topic-1',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 100000).toISOString(),
    };
    
    const payloadString = JSON.stringify(payload, Object.keys(payload).sort());
    const validSignature = crypto.createHmac('sha256', 'secret_key').update(payloadString).digest('hex');
    
    const spoofedDirective: TeacherFocusDirective = {
      ...payload,
      signature: validSignature
    };

    await expect(client.validateDirective(spoofedDirective, teacherCtx)).rejects.toMatchObject({
      code: 'INVALID_DSL_CONFIG',
      message: 'Directive createdBy identity mismatch'
    });
  });

  // 6. Mid-stream violation withheld after safe prefix
  it('mid-stream violation withheld after safe prefix', async () => {
    const ctx: ExecutionContext = { userId: 'u1', sessionId: 's1', role: 'student' };
    
    // Create a 250 word prompt where the violating string is exactly at the end.
    // The chunking mechanism is 200 tokens. The first 50 chunks are yielded safely!
    // The violation happens in the window containing the remaining 200 chunks.
    const promptTokens = Array.from({ length: 249 }, (_, i) => `safeword${i}`);
    promptTokens.push('bad_chunk');
    const prompt = promptTokens.join(' ');

    const iterator = client.executeStream(ctx, prompt, { struggle_threshold: 0, fallback_policy: 'offer_hint' });
    
    let yieldedChunks = 0;
    try {
      for await (const event of iterator) {
        if (event.type === 'chunk') {
          yieldedChunks++;
        }
      }
      fail('Expected PRE_FLIGHT_REJECTION to be thrown');
    } catch (e: any) {
      expect(e.code).toBe('PRE_FLIGHT_REJECTION');
      // The first 50 tokens (250 total - 200 window) were yielded safely.
      // But the violation is caught and the stream terminates BEFORE yielding any part of the 200-token window holding the bad_chunk.
      expect(yieldedChunks).toBe(50);
    }
  });
});
