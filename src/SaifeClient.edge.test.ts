import { DefaultSaifeClient } from './SaifeClient';
import { SaifeClientConfig, TeacherFocusDirective, ExecutionContext } from './types';

describe('SaifeClient Edge Cases', () => {
  let mockSessionStore: any;
  let client: DefaultSaifeClient;

  beforeEach(() => {
    mockSessionStore = {
      verifyTeacherRoster: jest.fn(),
      getHistory: jest.fn(),
      clearUserData: jest.fn(),
      exportUserData: jest.fn(),
      getSafetyRefusals: jest.fn(),
      incrementRejectionCount: jest.fn(),
      addToPenaltyBucket: jest.fn(),
      saveHistory: jest.fn(),
    };

    const config: SaifeClientConfig = {
      apiKey: 'test-key',
      focusTopics: {},
      sessionStore: mockSessionStore,
    };
    client = new DefaultSaifeClient(config);
  });

  // Edge Case 1
  it('validateDirective throws when expiresAt is "banana"', async () => {
    const directive: TeacherFocusDirective = {
      directiveId: 'dir-1',
      createdBy: 'teacher-1',
      studentId: 'student-1',
      focusTopicId: 'topic-1',
      createdAt: new Date().toISOString(),
      expiresAt: 'banana',
      signature: 'dummy-sig'
    };

    mockSessionStore.verifyTeacherRoster.mockResolvedValue(true);

    await expect(client.validateDirective(directive, { userId: 'teacher-1', sessionId: 's1', role: 'teacher' })).rejects.toMatchObject({
      code: 'INVALID_DSL_CONFIG',
      message: 'Invalid expiresAt date'
    });
  });

  // Edge Case 2
  it('executeStream ignores client-supplied history and loads from SessionStore', async () => {
    const ctx: ExecutionContext = { userId: 'u1', sessionId: 's1', role: 'student' };
    const prompt = "hello world";
    
    // Setup sessionStore history
    mockSessionStore.getHistory.mockResolvedValue([{ role: 'user', content: 'previous message' }]);

    const iterator = client.executeStream(ctx, prompt, { struggle_threshold: 0, fallback_policy: 'offer_hint' });
    const events = [];
    for await (const event of iterator) {
      events.push(event);
    }

    // Verify session store was called for history
    expect(mockSessionStore.getHistory).toHaveBeenCalledWith('s1');
    expect(mockSessionStore.saveHistory).toHaveBeenCalledWith('s1', [
      { role: 'user', content: 'previous message' },
      { role: 'user', content: prompt },
      { role: 'assistant', content: 'response' }
    ]);
  });

  // Edge Case 3
  it('Stream hold-back buffer processes an input exceeding 200 tokens', async () => {
    const ctx: ExecutionContext = { userId: 'u1', sessionId: 's1', role: 'student' };
    // Generate a prompt with 250 words
    const promptTokens = Array.from({ length: 250 }, (_, i) => `word${i}`);
    const prompt = promptTokens.join(' ');
    
    mockSessionStore.getHistory.mockResolvedValue([]);

    const iterator = client.executeStream(ctx, prompt, { struggle_threshold: 0, fallback_policy: 'offer_hint' });
    const chunks = [];
    for await (const event of iterator) {
      if (event.type === 'chunk') {
        chunks.push(event.content);
      }
    }

    expect(chunks.length).toBe(250);
    expect(chunks[0]).toBe('word0 ');
    expect(chunks[249]).toBe('word249 ');
  });

  // Edge Case 4
  it('validateDirective fails when the student is not on the teachers roster', async () => {
    const directive: TeacherFocusDirective = {
      directiveId: 'dir-2',
      createdBy: 'teacher-2',
      studentId: 'student-not-on-roster',
      focusTopicId: 'topic-2',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 100000).toISOString(),
      signature: 'dummy-sig'
    };

    mockSessionStore.verifyTeacherRoster.mockResolvedValue(false);

    await expect(client.validateDirective(directive, { userId: 'teacher-2', sessionId: 's1', role: 'teacher' })).rejects.toMatchObject({
      code: 'INVALID_DSL_CONFIG',
      message: 'Teacher not authorized for this student'
    });
  });
});
