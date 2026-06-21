import { EventEmitter } from 'events';

export class MockGuardEngine {
  public isOnline: boolean = true;

  public async evaluateContext(context: string): Promise<boolean> {
    if (!this.isOnline) {
      throw new Error("gRPC Guard-Engine connection refused (offline)");
    }
    // Simple Salami-Slicing restricted phrase check
    if (context.toLowerCase().includes('restricted_unsafe_phrase')) {
      return false;
    }
    return true;
  }
}

export class MockLLMService {
  public async generate(): Promise<{ tokens: string[], toolCalls?: any[], didacticViolations?: string[] }> {
    return {
      tokens: ['This ', 'is ', 'a ', 'safe ', 'response.'],
    };
  }

  public async generateAdversarial(): Promise<{ tokens: string[] }> {
    return {
      tokens: ['re', 'strict', 'ed', '_un', 'safe', '_phrase'],
    };
  }
}

export class MockTelemetryDispatcher {
  public events: Array<{ eventName: string, payload: Record<string, unknown>, priority: string }> = [];

  public dispatch(eventName: string, payload: Record<string, unknown>, priority: 'low' | 'medium' | 'high' | 'critical'): void {
    this.events.push({ eventName, payload, priority });
  }

  public clear(): void {
    this.events = [];
  }
}
