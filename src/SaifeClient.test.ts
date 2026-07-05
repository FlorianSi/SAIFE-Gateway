import { DefaultSaifeClient } from './SaifeClient';
import { SaifeClientConfig, ExecutionContext, DslConfig, TeacherFocusDirective } from './types';
import { InMemorySessionStore } from './InMemorySessionStore';
import * as crypto from 'crypto';

describe('SaifeClient Security Fixes', () => {
  let client: DefaultSaifeClient;
  let sessionStore: InMemorySessionStore;
  let mockAuditSink: any;

  beforeEach(() => {
    sessionStore = new InMemorySessionStore();
    sessionStore.setRoster('t1', ['u1']);

    mockAuditSink = { logEvent: jest.fn() };

    const config: SaifeClientConfig = {
      apiKey: 'test-key',
      sessionStore,
      auditSink: mockAuditSink,
      focusTopics: { 'TOPIC_1': 'Algebra' },
      directiveSecret: 'secret123'
    };

    client = new DefaultSaifeClient(config);
  });

  test('B1: Uses server-authoritative history, ignoring client input', async () => {
    const ctx: ExecutionContext = { userId: 'u1', sessionId: 's1', role: 'student' };
    const dsl: DslConfig = { struggle_threshold: 3, fallback_policy: 'offer_hint' };
    
    await sessionStore.saveHistory('s1', [{ role: 'user', content: 'previous message' }]);
    const iterator = client.executeStream(ctx, 'hello', dsl);
    for await (const _ of iterator) {}
    
    const history = await client.getHistory(ctx);
    expect(history.length).toBe(3); // previous + new prompt + assistant response
  });

  test('B4: Refuses plaintext gRPC connections and requires tlsConfig', () => {
    expect(() => {
      new DefaultSaifeClient({ apiKey: 'key', guardEngineEndpoint: 'http://localhost:50051', focusTopics: {}, directiveSecret: 'secret123' });
    }).toThrow('Plaintext gRPC refused');
    
    expect(() => {
      new DefaultSaifeClient({ apiKey: 'key', guardEngineEndpoint: 'https://localhost:50051', focusTopics: {}, directiveSecret: 'secret123' });
    }).toThrow('mTLS credentials (cert, key) required');
    
    expect(() => {
      new DefaultSaifeClient({ 
        apiKey: 'key', 
        guardEngineEndpoint: 'https://localhost:50051', 
        tlsConfig: { cert: 'cert', key: 'key' },
        focusTopics: {},
        directiveSecret: 'secret123'
      });
    }).not.toThrow();
  });

  test('Provider config throws if transfer basis is missing or DPA not executed (PROVIDER-CONFIG-VALIDATION)', () => {
    // Missing transfer basis (NONE)
    expect(() => {
      new DefaultSaifeClient({ 
        apiKey: 'key', 
        focusTopics: {}, 
        providerConfig: { dpaExecuted: true, transferBasis: 'NONE', noTrainingClause: true, endpointRegion: 'EU' } 
      });
    }).toThrow('Provider configuration requires a valid transfer basis');

    // Missing DPA
    expect(() => {
      new DefaultSaifeClient({ 
        apiKey: 'key', 
        focusTopics: {}, 
        providerConfig: { dpaExecuted: false, transferBasis: 'DPF', noTrainingClause: true, endpointRegion: 'EU' } 
      });
    }).toThrow('Provider configuration requires an executed DPA/AVV');

    // Missing no-training clause
    expect(() => {
      new DefaultSaifeClient({ 
        apiKey: 'key', 
        focusTopics: {}, 
        providerConfig: { dpaExecuted: true, transferBasis: 'DPF', noTrainingClause: false, endpointRegion: 'EU' } 
      });
    }).toThrow('Provider configuration requires a contractual no-training clause');

    // Invalid region TIA combo
    expect(() => {
      new DefaultSaifeClient({ 
        apiKey: 'key', 
        focusTopics: {}, 
        providerConfig: { dpaExecuted: true, transferBasis: 'DPF', noTrainingClause: true, endpointRegion: 'OTHER', tiaAddressesEndpointIfOther: false } 
      });
    }).toThrow('Non-EU endpoints require a TIA explicitly addressing the region');

    // Valid provider config
    expect(() => {
      new DefaultSaifeClient({ 
        apiKey: 'key', 
        focusTopics: {}, 
        providerConfig: { dpaExecuted: true, transferBasis: 'DPF', noTrainingClause: true, endpointRegion: 'EU' } 
      });
    }).not.toThrow();
  });

  test('B2/D2: Directive with NaN date or >30d TTL fails closed', async () => {
    const validDirective: any = {
      directiveId: 'd1', studentId: 'u1', focusTopicId: 't1', 
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
      createdBy: 't1'
    };
    
    // Sign valid directive
    const payload = JSON.stringify(validDirective, Object.keys(validDirective).sort());
    validDirective.signature = crypto.createHmac('sha256', 'secret123').update(payload).digest('hex');

    await expect(client.validateDirective(validDirective, { userId: 't1', sessionId: 's1', role: 'teacher' })).resolves.not.toThrow();

    const invalidDateDirective = { ...validDirective, expiresAt: 'not-a-date' };
    delete invalidDateDirective.signature;
    const payload2 = JSON.stringify(invalidDateDirective, Object.keys(invalidDateDirective).sort());
    invalidDateDirective.signature = crypto.createHmac('sha256', 'secret123').update(payload2).digest('hex');
    await expect(client.validateDirective(invalidDateDirective, { userId: 't1', sessionId: 's1', role: 'teacher' })).rejects.toThrow('Invalid expiresAt date');

    const tooLongDirective = { ...validDirective, expiresAt: new Date(Date.now() + 40 * 24 * 3600 * 1000).toISOString() };
    delete tooLongDirective.signature;
    const payload3 = JSON.stringify(tooLongDirective, Object.keys(tooLongDirective).sort());
    tooLongDirective.signature = crypto.createHmac('sha256', 'secret123').update(payload3).digest('hex');
    await expect(client.validateDirective(tooLongDirective, { userId: 't1', sessionId: 's1', role: 'teacher' })).rejects.toThrow('30-day maximum TTL');
  });

  test('B3: Directives without createdBy/signature are rejected, and roster is checked', async () => {
    const unsigned: any = { directiveId: 'd1', studentId: 'u1', focusTopicId: 't1' };
    await expect(client.validateDirective(unsigned, { userId: 't1', sessionId: 's1', role: 'teacher' })).rejects.toThrow('Directive lacks authorship or signature');
    
    const notOnRoster: any = {
      directiveId: 'd2', studentId: 'u2', focusTopicId: 't1', 
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
      createdBy: 't1'
    };
    const payload = JSON.stringify(notOnRoster, Object.keys(notOnRoster).sort());
    notOnRoster.signature = crypto.createHmac('sha256', 'secret123').update(payload).digest('hex');
    
    await expect(client.validateDirective(notOnRoster, { userId: 't1', sessionId: 's1', role: 'teacher' })).rejects.toThrow('Teacher not authorized for this student');
  });

  test('A1/A2: Blocks stream mid-flight if sliding window detects bad chunk, no bad tokens emitted', async () => {
    const ctx: ExecutionContext = { userId: 'u1', sessionId: 's1', role: 'student' };
    const dsl: DslConfig = { struggle_threshold: 3, fallback_policy: 'offer_hint' };
    const iterator = client.executeStream(ctx, 'good good bad_chunk', dsl);
    
    const events = [];
    try {
      for await (const event of iterator) {
        events.push(event);
      }
    } catch (e: any) {
      expect(e.message).toBe("This request can't be processed.");
    }
    // Hold-back ensures the bad chunk was never yielded. "good good bad_chunk" throws before emitting because buffer didn't hit 50 length.
    expect(events.length).toBe(0); 
  });
  
  test('A8: deleteUserData and exportUserData API', async () => {
    await sessionStore.addToPenaltyBucket('u1', 10);
    expect(await sessionStore.getPenalty('u1')).toBe(10);
    
    let exportData = await client.exportUserData('u1');
    expect(exportData.penalties.penaltySeconds).toBe(10);
    
    await client.deleteUserData('u1');
    expect(await sessionStore.getPenalty('u1')).toBe(0);
    
    exportData = await client.exportUserData('u1');
    expect(exportData.penalties).toBeUndefined();
  });
});
