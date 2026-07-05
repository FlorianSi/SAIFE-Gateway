import { ITelemetrySink } from './types';
import * as fs from 'fs';

export class FileTelemetrySink implements ITelemetrySink {
  private logPath: string;
  private buffer: Array<{ type: string, count: number, categoryCode: string, userId?: string, ts: number }> = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(logPath: string) {
    this.logPath = logPath;
    this.timer = setInterval(() => this.flush(), 60000); // 60-second in-memory batching
  }

  public async logEvent(event: { type: string, count: number, categoryCode: string, userId?: string }): Promise<void> {
    this.buffer.push({ ...event, ts: Date.now() });
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const data = this.buffer.splice(0, this.buffer.length);
    const lines = data.map(d => JSON.stringify(d)).join('\n') + '\n';
    try {
      fs.appendFileSync(this.logPath, lines);
    } catch (e) {
      console.error('Telemetry write failed:', e);
    }
  }

  public async evictExpiredRecords(cutoffMs: number): Promise<void> {
    // POC: For a real system, this would read the file, filter out old lines, and rewrite.
    // Given POC is append-only JSONL, we simulate it here.
    try {
      if (fs.existsSync(this.logPath)) {
        const content = fs.readFileSync(this.logPath, 'utf8');
        const validLines = content.split('\n').filter(line => {
          if (!line) return false;
          try {
            const parsed = JSON.parse(line);
            return parsed.ts >= cutoffMs;
          } catch { return false; }
        });
        fs.writeFileSync(this.logPath, validLines.join('\n') + (validLines.length ? '\n' : ''));
      }
    } catch (e) {
      console.error('Telemetry eviction failed:', e);
    }
  }

  public async deleteUserData(userId: string): Promise<void> {
    try {
      if (fs.existsSync(this.logPath)) {
        const content = fs.readFileSync(this.logPath, 'utf8');
        const validLines = content.split('\n').filter(line => {
          if (!line) return false;
          try {
            const parsed = JSON.parse(line);
            return parsed.userId !== userId;
          } catch { return false; }
        });
        fs.writeFileSync(this.logPath, validLines.join('\n') + (validLines.length ? '\n' : ''));
      }
    } catch (e) {
      console.error('Telemetry deletion failed:', e);
    }
  }

  public shutdown() {
    if (this.timer) clearInterval(this.timer);
    this.flush();
  }
}
