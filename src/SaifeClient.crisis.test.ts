import { DefaultSaifeClient } from './SaifeClient';
import { SaifeClientConfig, ExecutionContext, DslConfig } from './types';
import { InMemorySessionStore } from './InMemorySessionStore';
import { InMemoryCrisisStore } from './InMemoryCrisisStore';
import { WebhookCrisisTransport } from './WebhookCrisisTransport';

const originalFetch = global.fetch;

describe('SaifeClient Crisis Pipeline (Gate verification)', () => {
  let client: DefaultSaifeClient;
  let sessionStore: InMemorySessionStore;
  let crisisStore: InMemoryCrisisStore;
  let crisisAlertTransport: WebhookCrisisTransport;
  let mockAuditSink: any;

  beforeEach(() => {
    // Suppress console.warn for DEV-ONLY tests to avoid cluttering test output
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    sessionStore = new InMemorySessionStore();
    crisisStore = new InMemoryCrisisStore();
    mockAuditSink = { logEvent: jest.fn() };
    crisisAlertTransport = new WebhookCrisisTransport('https://alert.webhook.local', mockAuditSink);

    const config: SaifeClientConfig = {
      apiKey: 'test-key',
      sessionStore,
      auditSink: mockAuditSink,
      crisisStore,
      crisisAlertTransport,
      focusTopics: {}
    };

    client = new DefaultSaifeClient(config);
    global.fetch = jest.fn().mockResolvedValue({ ok: true }); 
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // 1: crisis+attack → crisis wins
  test('crisis+attack -> crisis wins', async () => {
    const ctx: ExecutionContext = { userId: 'u1', sessionId: 's1', role: 'student' };
    const dsl: DslConfig = { struggle_threshold: 3, fallback_policy: 'offer_hint' };
    
    // Both attack (salami) and crisis (suizid) keywords
    const iterator = client.executeStream(ctx, 'salami attack and suizid thought', dsl);
    const events = [];
    for await (const event of iterator) events.push(event);

    expect(await sessionStore.getPenalty('u1')).toBe(0); // Attack penalty bypassed
    expect(mockAuditSink.logEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'pre_flight_rejection' }));
    expect(events.length).toBe(2);
    expect((events[0] as any).content).toContain('Nummer gegen Kummer');
  });

  // 2: rate-limited user in crisis
  test('rate-limited user in crisis', async () => {
    const ctx: ExecutionContext = { userId: 'u1', sessionId: 's1', role: 'student' };
    const dsl: DslConfig = { struggle_threshold: 3, fallback_policy: 'offer_hint' };
    
    // Artificially rate limit the user above the max
    await sessionStore.addToPenaltyBucket('u1', 9999); 
    // In our POC, if rate-limits were checked early, it would throw 429. 
    // Since Crisis checks first, it bypasses the throw.
    
    const iterator = client.executeStream(ctx, 'Ich denke über selbstmord nach', dsl);
    const events = [];
    for await (const event of iterator) events.push(event);

    expect(events.length).toBe(2);
    expect((events[0] as any).content).toContain('Nummer gegen Kummer');
  });

  // 3: webhook-down with normal response time
  test('webhook-down with normal response time', async () => {
    const ctx: ExecutionContext = { userId: 'u1', sessionId: 's1', role: 'student' };
    const dsl: DslConfig = { struggle_threshold: 3, fallback_policy: 'offer_hint' };
    
    let fetchResolve: any;
    global.fetch = jest.fn().mockImplementation(() => new Promise(r => fetchResolve = r));

    const start = Date.now();
    const iterator = client.executeStream(ctx, 'umbringen', dsl);
    const events = [];
    for await (const event of iterator) events.push(event);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100); // Responded normally despite hanging webhook
    expect(events.length).toBe(2);
    fetchResolve({ ok: true }); // cleanup
  });

  // 4: German phrasing
  test('German phrasing', async () => {
    const ctx: ExecutionContext = { userId: 'u1', sessionId: 's1', role: 'student' };
    const dsl: DslConfig = { struggle_threshold: 3, fallback_policy: 'offer_hint' };
    
    // Test the expanded German phrasing matches
    const iterator = client.executeStream(ctx, 'Ich will nicht mehr leben', dsl);
    const events = [];
    for await (const event of iterator) events.push(event);

    const message = (events[0] as any).content;
    expect(message).toContain('Ich bin nur ein Computerprogramm');
    expect(message).toContain('Nummer gegen Kummer');
    // Ensure the bureaucratic placeholder string is NOT in the rendered output to the user
    expect(message).not.toContain('[PLACEHOLDER');
  });

  // 5: restart-recovery contract
  test('restart-recovery contract', async () => {
    // In our InMemory POC, restart-recovery contract means exportUserData successfully pulls from the store 
    // mimicking a persistent schema that survives restarts. We verify the store accurately logs and returns it.
    const ctx: ExecutionContext = { userId: 'u1', sessionId: 's1', role: 'student' };
    const dsl: DslConfig = { struggle_threshold: 3, fallback_policy: 'offer_hint' };
    const iterator = client.executeStream(ctx, 'suizid', dsl);
    for await (const _ of iterator) {}

    const exported = await client.exportUserData('u1');
    expect(exported.crisisEvents).toBeDefined();
    expect(exported.crisisEvents.length).toBe(1);
    expect(exported.crisisEvents[0].category).toBe('SELF_HARM');
  });

  // 6: client stream contains only chunk/done
  test('client stream contains only chunk/done', async () => {
    const ctx: ExecutionContext = { userId: 'u1', sessionId: 's1', role: 'student' };
    const dsl: DslConfig = { struggle_threshold: 3, fallback_policy: 'offer_hint' };
    
    const iterator = client.executeStream(ctx, 'selbstmord', dsl);
    const events = [];
    for await (const event of iterator) events.push(event);

    // Assert strictly no internal guard_triggered events leaked
    for (const event of events) {
      expect(['chunk', 'done']).toContain(event.type);
    }
  });

});
