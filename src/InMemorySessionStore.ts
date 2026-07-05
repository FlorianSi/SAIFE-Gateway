import { ISessionStore, ConversationMessage } from './types';

interface RateLimitEntry {
  penaltySeconds: number;
  expiresAt: number;
}

export class InMemorySessionStore implements ISessionStore {
  private history: Map<string, ConversationMessage[]> = new Map();
  private penalties: Map<string, RateLimitEntry> = new Map();
  private safetyRefusals: Map<string, number> = new Map();
  private rejections: Map<string, Record<string, number>> = new Map();
  private directives: Map<string, any> = new Map();
  private teacherRosters: Map<string, Set<string>> = new Map();

  // Test setup helper
  public setRoster(teacherId: string, studentIds: string[]) {
    this.teacherRosters.set(teacherId, new Set(studentIds));
  }

  async getHistory(sessionId: string): Promise<ConversationMessage[]> {
    return this.history.get(sessionId) || [];
  }

  async saveHistory(sessionId: string, messages: ConversationMessage[]): Promise<void> {
    this.history.set(sessionId, messages);
  }

  async addToPenaltyBucket(userId: string, seconds: number): Promise<void> {
    const now = Date.now();
    const entry = this.penalties.get(userId);
    let currentPenalty = 0;
    if (entry && entry.expiresAt > now) {
      currentPenalty = entry.penaltySeconds;
    }
    const newPenalty = currentPenalty + seconds;
    this.penalties.set(userId, {
      penaltySeconds: newPenalty,
      expiresAt: now + (newPenalty * 1000)
    });
  }

  async getPenalty(userId: string): Promise<number> {
    const now = Date.now();
    const entry = this.penalties.get(userId);
    if (entry && entry.expiresAt > now) {
      return entry.penaltySeconds;
    }
    if (entry && entry.expiresAt <= now) {
      this.penalties.delete(userId); // TTL Eviction
    }
    return 0;
  }

  async clearUserData(userId: string): Promise<void> {
    this.penalties.delete(userId);
    this.safetyRefusals.delete(userId);
    this.rejections.delete(userId);
    
    // For this POC, we must clear history associated with the user.
    // We assume history is keyed by sessionId, and we iterate to find them.
    // In a real DB, this is a WHERE userId = ? query.
    for (const [sessionId, messages] of this.history.entries()) {
      // In this POC we assume sessionId usually maps 1:1 or contains userId
      // Here we just delete everything for simplicity, or we should explicitly map userId to sessionIds.
      // Since history lacks userId context in the Map directly, we clear based on the assumption 
      // that sessionId prefix == userId for the POC tests.
      if (sessionId.startsWith(userId)) {
        this.history.delete(sessionId);
      }
    }
  }

  async exportUserData(userId: string): Promise<any> {
    const userHistory: any[] = [];
    for (const [sessionId, messages] of this.history.entries()) {
      if (sessionId.startsWith(userId)) {
        userHistory.push({ sessionId, messages });
      }
    }
    
    // Directives should also be exported if stored here (we'll just mock for now)
    const userDirectives: any[] = [];
    for (const [id, dir] of this.directives.entries()) {
      if (dir.studentId === userId || dir.createdBy === userId) {
        userDirectives.push(dir);
      }
    }

    return {
      userId,
      penalties: this.penalties.get(userId),
      safetyRefusals: this.safetyRefusals.get(userId),
      rejections: this.rejections.get(userId),
      history: userHistory,
      directives: userDirectives
    };
  }

  async clearDirectives(userId: string): Promise<void> {
    for (const [id, dir] of this.directives.entries()) {
      if (dir.studentId === userId || dir.createdBy === userId) {
        this.directives.delete(id);
      }
    }
  }

  async incrementSafetyRefusal(userId: string): Promise<number> {
    const val = (this.safetyRefusals.get(userId) || 0) + 1;
    this.safetyRefusals.set(userId, val);
    return val;
  }

  async getSafetyRefusals(userId: string): Promise<number> {
    return this.safetyRefusals.get(userId) || 0;
  }

  async getRejectionCount(userId: string, date: string): Promise<number> {
    const userRej = this.rejections.get(userId) || {};
    return userRej[date] || 0;
  }

  async incrementRejectionCount(userId: string, date: string): Promise<number> {
    const userRej = this.rejections.get(userId) || {};
    const val = (userRej[date] || 0) + 1;
    userRej[date] = val;
    this.rejections.set(userId, userRej);
    return val;
  }

  async verifyTeacherRoster(teacherId: string, studentId: string): Promise<boolean> {
    const roster = this.teacherRosters.get(teacherId);
    return roster ? roster.has(studentId) : false;
  }
}
