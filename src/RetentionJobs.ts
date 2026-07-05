import { ISessionStore, ICrisisStore, ITelemetrySink, IAuditSink } from './types';

export class RetentionJobs {
  constructor(
    private sessionStore?: ISessionStore,
    private crisisStore?: ICrisisStore,
    private telemetrySink?: ITelemetrySink,
    private auditSink?: IAuditSink
  ) {}

  public async runDailySweep(): Promise<void> {
    const now = Date.now();
    
    // Retention schedules:
    // Raw chat history: 7 days (grace period post-session)
    const HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
    // Rate-limit / penalty buckets: 24 hours
    const PENALTY_TTL_MS = 24 * 60 * 60 * 1000;
    // Crisis records: 12 months
    const CRISIS_TTL_MS = 365 * 24 * 60 * 60 * 1000;
    // Security telemetry: 30 days
    const TELEMETRY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
    // Art. 12 audit logs: 6 months minimum
    const AUDIT_TTL_MS = 6 * 30 * 24 * 60 * 60 * 1000;

    if (this.sessionStore && this.sessionStore.evictExpiredRecords) {
      await this.sessionStore.evictExpiredRecords(now - HISTORY_TTL_MS, now - PENALTY_TTL_MS);
    }

    if (this.crisisStore && this.crisisStore.evictExpiredRecords) {
      await this.crisisStore.evictExpiredRecords(now - CRISIS_TTL_MS);
    }

    if (this.telemetrySink && this.telemetrySink.evictExpiredRecords) {
      await this.telemetrySink.evictExpiredRecords(now - TELEMETRY_TTL_MS);
    }

    if (this.auditSink && this.auditSink.evictExpiredRecords) {
      await this.auditSink.evictExpiredRecords(now - AUDIT_TTL_MS);
    }
  }
}
