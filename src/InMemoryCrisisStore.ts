import { ICrisisStore, CrisisEvent } from './types';

// ======================================================
// !! WARNING: DEV/POC ONLY — NOT FOR PRODUCTION !!
// This in-memory store is volatile. Crisis events are 
// Art. 9 special category data requiring persistent, 
// secure, and highly available storage in production.
// ======================================================

export class InMemoryCrisisStore implements ICrisisStore {
  private store: Map<string, CrisisEvent[]> = new Map();

  constructor() {
    console.warn("======================================================");
    console.warn("!! WARNING: DEV/POC ONLY — NOT FOR PRODUCTION !!");
    console.warn("InMemoryCrisisStore is volatile. Crisis events are");
    console.warn("Art. 9 special category data requiring persistent,");
    console.warn("secure, and highly available storage in production.");
    console.warn("======================================================");
  }

  async saveCrisisEvent(event: CrisisEvent): Promise<void> {
    const events = this.store.get(event.userId) || [];
    events.push(event);
    this.store.set(event.userId, events);
    
    // Simulating 12-month TTL enforcement (cleanup logic omitted for POC)
  }

  async exportUserData(userId: string): Promise<CrisisEvent[]> {
    return this.store.get(userId) || [];
  }

  async deleteUserData(userId: string, allowExemptionDeletion: boolean = false): Promise<void> {
    // [REVIEW: DPO-CRISIS-RETENTION] - Should crisis records be deleted on standard user deletion request?
    // Usually Art. 9(2)(c) vital interest records have independent retention mandates.
    if (allowExemptionDeletion) {
      this.store.delete(userId);
    } else {
      console.warn(`[POLICY] Attempted to delete crisis records for ${userId}. Ignored due to policy flag.`);
    }
  }

  // Helper for tests
  async hasCategoryThisSession(sessionId: string, category: string): Promise<boolean> {
    for (const events of this.store.values()) {
      if (events.some(e => e.sessionId === sessionId && e.category === category)) {
        return true;
      }
    }
    return false;
  }
}
