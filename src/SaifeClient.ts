import RE2 from 're2';
import * as crypto from 'crypto';
import { 
  SaifeClientConfig, ExecutionContext, DslConfig, SaifeStreamEvent, 
  SaifeError, TeacherFocusDirective, ConversationMessage, SaifeClient, CrisisEvent
} from './types';

import { InputSanitizer } from './Sanitizer';

if (!RE2) {
  throw new Error("FATAL: RE2 regex engine not available. Halting to prevent ReDoS.");
}

export class DefaultSaifeClient implements SaifeClient {
  constructor(private config: SaifeClientConfig) {
    if (config.providerConfig) {
      if (!config.providerConfig.dpaExecuted) {
        throw new SaifeError('VALIDATION_ERROR', 'Provider configuration requires an executed DPA/AVV.');
      }
      if (config.providerConfig.transferBasis === 'NONE') {
        throw new SaifeError('VALIDATION_ERROR', 'Provider configuration requires a valid transfer basis (DPF or SCC_TIA).');
      }
      if (!config.providerConfig.noTrainingClause) {
        throw new SaifeError('VALIDATION_ERROR', 'Provider configuration requires a contractual no-training clause.');
      }
      if (config.providerConfig.endpointRegion !== 'EU' && !config.providerConfig.tiaAddressesEndpointIfOther) {
        throw new SaifeError('VALIDATION_ERROR', 'Non-EU endpoints require a TIA explicitly addressing the region.');
      }

      if (config.providerConfig.temperature !== undefined && config.providerConfig.temperature > 0.2) {
        throw new SaifeError('VALIDATION_ERROR', 'Provider temperature must be <= 0.2');
      }
      if (config.providerConfig.loggingEnabled === false) {
        throw new SaifeError('VALIDATION_ERROR', 'Provider logging cannot be disabled');
      }
    }
    
    if (config.guardEngineEndpoint) {
      if (config.guardEngineEndpoint.startsWith('http://')) {
        throw new SaifeError('VALIDATION_ERROR', 'Plaintext gRPC refused. mTLS required.');
      }
      if (!config.tlsConfig || !config.tlsConfig.cert || !config.tlsConfig.key) {
        throw new SaifeError('VALIDATION_ERROR', 'mTLS credentials (cert, key) required for guardEngineEndpoint.');
      }
      if (!config.directiveSecret) {
        throw new SaifeError('VALIDATION_ERROR', 'DirectiveSecret is required when external guardEngine is loaded.');
      }
    }
  }

  public async validateDirective(directive: TeacherFocusDirective, teacherCtx: ExecutionContext): Promise<void> {
    if (!directive.createdBy || !directive.signature) {
      throw new SaifeError('INVALID_DSL_CONFIG', 'Directive lacks authorship or signature');
    }

    if (directive.createdBy !== teacherCtx.userId) {
      throw new SaifeError('INVALID_DSL_CONFIG', 'Directive createdBy identity mismatch');
    }

    if (this.config.directiveSecret) {
      const { signature, ...rest } = directive;
      const payload = JSON.stringify(rest, Object.keys(rest).sort());
      const expectedSig = crypto.createHmac('sha256', this.config.directiveSecret).update(payload).digest('hex');
      if (expectedSig !== signature) {
        throw new SaifeError('INVALID_DSL_CONFIG', 'Directive signature mismatch');
      }
    }

    if (this.config.sessionStore) {
      const isAuthorized = await this.config.sessionStore.verifyTeacherRoster(directive.createdBy, directive.studentId);
      if (!isAuthorized) {
        throw new SaifeError('INVALID_DSL_CONFIG', 'Teacher not authorized for this student');
      }
    }

    const createdDate = Date.parse(directive.createdAt);
    let expiryDate = Date.parse(directive.expiresAt);

    if (isNaN(createdDate)) {
      throw new SaifeError('INVALID_DSL_CONFIG', 'Invalid createdAt date');
    }

    if (isNaN(expiryDate)) {
      throw new SaifeError('INVALID_DSL_CONFIG', 'Invalid expiresAt date');
    }

    const MAX_TTL = 30 * 24 * 60 * 60 * 1000;
    if (expiryDate - createdDate > MAX_TTL) {
      throw new SaifeError('INVALID_DSL_CONFIG', 'expiresAt exceeds 30-day maximum TTL');
    }

    if (Date.now() > expiryDate) {
      throw new SaifeError('INVALID_DSL_CONFIG', 'Directive expired');
    }
  }

  public async grantExemption(teacherCtx: ExecutionContext, studentId: string): Promise<void> {
    if (this.config.sessionStore) {
      const isAuthorized = await this.config.sessionStore.verifyTeacherRoster(teacherCtx.userId, studentId);
      if (!isAuthorized) {
        throw new SaifeError('INVALID_DSL_CONFIG', 'Teacher not authorized for this student');
      }
    }
    // OUT OF SCOPE (POC): Exemption persistence logic is deferred. 
    throw new SaifeError('VALIDATION_ERROR', 'Exemption persistence is OUT OF SCOPE (POC)');
  }

  public validateTopics(topics: Record<string, string>): void {
    const ALLOW_LIST = /^[a-zA-Z0-9_.\-\säöüßÄÖÜ]+$/;
    for (const [key, value] of Object.entries(topics)) {
      if (value.length > 50) {
        throw new SaifeError('VALIDATION_ERROR', 'Topic string too long');
      }
      if (!ALLOW_LIST.test(value)) {
        throw new SaifeError('VALIDATION_ERROR', 'Topic string contains invalid characters');
      }
    }
  }

  public async getHistory(ctx: ExecutionContext): Promise<ConversationMessage[]> {
    if (!this.config.sessionStore) return [];
    return this.config.sessionStore.getHistory(ctx.sessionId);
  }

  public async deleteUserData(userId: string): Promise<void> {
    if (this.config.sessionStore) {
      await this.config.sessionStore.clearUserData(userId);
      await this.config.sessionStore.clearDirectives(userId);
    }
    if (this.config.telemetrySink) {
      await this.config.telemetrySink.deleteUserData(userId);
    }
    // [REVIEW: DPO-CRISIS-RETENTION] - Crisis records are strictly excluded from standard deletion 
    // unless an explicit exemption flag is provided to deleteUserData.
    if (this.config.crisisStore) {
      // Intentionally omitting allowExemptionDeletion flag to enforce default retention
      await this.config.crisisStore.deleteUserData(userId, false); 
    }
  }

  public async exportUserData(userId: string): Promise<any> {
    let data: any = { userId };
    if (this.config.sessionStore) {
      data = { ...data, ...await this.config.sessionStore.exportUserData(userId) };
    }
    if (this.config.crisisStore) {
      data.crisisEvents = await this.config.crisisStore.exportUserData(userId); // Art. 15 compliance
    }
    return data;
  }

  public async *executeStream(
    ctx: ExecutionContext,
    prompt: string,
    dslConfig: DslConfig
  ): AsyncIterable<SaifeStreamEvent> {
    
    this.validateTopics(this.config.focusTopics);

    if (typeof prompt !== 'string') {
      throw new SaifeError('VALIDATION_ERROR', 'Prompt must be a string');
    }

    // --- CRISIS PIPELINE (Executes FIRST) ---
    // [REVIEW: CRISIS-PATTERNS] - Primary German pattern set
    const crisisPatterns = [
      'selbstmord', 'suizid', 'umbringen', 
      'ich will nicht mehr leben', 'ich kann nicht mehr', 'ritzen',
      'lebensmüde', 'sterben wollen', 'keinen sinn mehr',
      'suicide', 'kill myself', 'end my life', 'cut myself', 'want to die'
    ].join('|');
    const crisisClassifier = new RE2(new RegExp(crisisPatterns, 'i'));
    const isCrisis = crisisClassifier.test(prompt);

    if (isCrisis) {
      if (this.config.crisisStore && this.config.crisisAlertTransport) {
        const category = 'SELF_HARM';
        const alreadyAlerted = await this.config.crisisStore.hasCategoryThisSession(ctx.sessionId, category);
        
        if (!alreadyAlerted) {
          const crisisEvent: CrisisEvent = {
            userId: ctx.userId,
            sessionId: ctx.sessionId,
            timestamp: new Date().toISOString(),
            category
          };

          // Persist-first
          await this.config.crisisStore.saveCrisisEvent(crisisEvent);

          // Alert-asynchronously (do not await)
          this.config.crisisAlertTransport.sendAlert(crisisEvent).catch(console.error);
        }
      }

      // Respond-immediately (Never rate limited, never throws 429)
      // [REVIEW: CRISIS-WORDING] Supportive message text
      const SUPPORTIVE_MESSAGE = "Danke, dass du das geschrieben hast. Ich bin nur ein Computerprogramm und kann dir bei so etwas Wichtigem nicht richtig helfen — aber es gibt Menschen, die das können. Bitte sprich mit einer erwachsenen Person, der du vertraust, zum Beispiel an deiner Schule. Du bist damit nicht allein. Du kannst auch jederzeit anonym und kostenlos anrufen: Nummer gegen Kummer 116 111 oder TelefonSeelsorge 0800 111 0 111 (rund um die Uhr erreichbar).";
      
      yield { type: 'chunk', content: SUPPORTIVE_MESSAGE, tokens: SUPPORTIVE_MESSAGE.length };
      yield { type: 'done', totalTokens: SUPPORTIVE_MESSAGE.length };
      return; 
    }
    // --- END CRISIS PIPELINE ---


    // --- ATTACK PIPELINE ---
    let history = await this.getHistory(ctx);

    // Apply shared reserved-token stripping to user input
    let safePrompt = InputSanitizer.sanitize(prompt);
    
    if (this.config.redactionProvider) {
      safePrompt = this.config.redactionProvider.redact(safePrompt);
    }

    // History Truncation
    const MAX_HISTORY_MESSAGES = 10; // Simplified token limits: drop oldest if > 10 messages
    if (history.length > MAX_HISTORY_MESSAGES) {
      history = history.slice(history.length - MAX_HISTORY_MESSAGES);
    }

    let safetyRefusals = 0;
    if (this.config.sessionStore) {
      safetyRefusals = await this.config.sessionStore.getSafetyRefusals(ctx.userId);
    }
    
    // focusTopics Interpolation with Delimiters
    const topicsList = Object.entries(this.config.focusTopics).map(([k, v]) => `${k}: ${v}`).join(', ');
    const systemPrompt = `[SAFETY_LEDGER: PRIOR_REFUSALS=${safetyRefusals}]\n<focus_topics>${topicsList}</focus_topics>`;

    if (this.config.auditSink) {
      await this.config.auditSink.logEvent({ type: 'stream_start', userId: ctx.userId, timestamp: Date.now() });
    }

    const attackRegex = new RE2(/salami/i);
    if (attackRegex.test(safePrompt)) {
      if (this.config.sessionStore) {
        const today = new Date().toISOString().split('T')[0];
        const count = await this.config.sessionStore.incrementRejectionCount(ctx.userId, today);
        if (count > 2) {
           await this.config.sessionStore.addToPenaltyBucket(ctx.userId, 10);
        }
      }
      if (this.config.auditSink) {
        await this.config.auditSink.logEvent({ type: 'pre_flight_rejection', userId: ctx.userId });
      }
      throw new SaifeError('PRE_FLIGHT_REJECTION', 'This request can\'t be processed.'); 
    }

    const mockModelOutputChunks = safePrompt.split(' ').map(w => w + ' '); 
    
    const MAX_WINDOW_TOKENS = this.config.chunkSizeTokens || 200; 
    const windowTokens: string[] = [];
    const holdBackBuffer: string[] = [];

    for (const chunk of mockModelOutputChunks) {
      windowTokens.push(chunk);
      if (windowTokens.length > MAX_WINDOW_TOKENS) {
        windowTokens.shift();
      }
      
      const windowText = windowTokens.join('');
      if (new RE2(/bad_chunk/i).test(windowText)) {
        throw new SaifeError('PRE_FLIGHT_REJECTION', 'This request can\'t be processed.');
      }
      
      holdBackBuffer.push(chunk);
      if (holdBackBuffer.length >= MAX_WINDOW_TOKENS) { 
        const emitChunk = holdBackBuffer.shift()!;
        yield { type: 'chunk', content: emitChunk, tokens: 1 };
      }
    }

    while(holdBackBuffer.length > 0) {
      yield { type: 'chunk', content: holdBackBuffer.shift()!, tokens: 1 };
    }

    if (this.config.sessionStore) {
      await this.config.sessionStore.saveHistory(ctx.sessionId, [...history, { role: 'user', content: safePrompt }, { role: 'assistant', content: 'response' }]);
    }

    yield { type: 'done', totalTokens: mockModelOutputChunks.length };
  }
}
