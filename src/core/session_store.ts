import { ISessionStore } from '../types/api_types';

export class InMemorySessionStore implements ISessionStore {
  private store = new Map<string, number>();

  async incrementStruggle(sessionId: string): Promise<number> {
    const current = (this.store.get(sessionId) || 0) + 1;
    this.store.set(sessionId, current);
    return current;
  }

  async getStruggleCount(sessionId: string): Promise<number> {
    return this.store.get(sessionId) || 0;
  }

  async resetStruggle(sessionId: string): Promise<void> {
    this.store.set(sessionId, 0);
  }
}
