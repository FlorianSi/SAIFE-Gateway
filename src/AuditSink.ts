import * as fs from 'fs';
import * as crypto from 'crypto';
import { IAuditSink } from './types';

export class HashChainedAuditSink implements IAuditSink {
  private logFilePath: string;
  private lastHash: string;

  constructor(logFilePath: string) {
    this.logFilePath = logFilePath;
    this.lastHash = '0000000000000000000000000000000000000000000000000000000000000000'; // Genesis hash
    
    // In a real implementation, we would read the last line of the file to recover lastHash on startup
    if (!fs.existsSync(this.logFilePath)) {
      fs.writeFileSync(this.logFilePath, '');
    }
  }

  public async logEvent(event: any): Promise<void> {
    // Strip any PII or content if it accidentally got here
    const cleanEvent = { ...event };
    delete cleanEvent.content;
    delete cleanEvent.prompt;

    const payload = JSON.stringify(cleanEvent);
    
    const entry = {
      timestamp: new Date().toISOString(),
      payload,
      previousHash: this.lastHash
    };

    const entryString = JSON.stringify(entry);
    const hash = crypto.createHash('sha256').update(entryString).digest('hex');
    
    const finalEntry = {
      ...entry,
      hash
    };

    this.lastHash = hash;
    fs.appendFileSync(this.logFilePath, JSON.stringify(finalEntry) + '\n');
  }
}
