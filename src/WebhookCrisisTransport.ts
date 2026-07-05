import { ICrisisAlertTransport, CrisisEvent, IAuditSink } from './types';

export class WebhookCrisisTransport implements ICrisisAlertTransport {
  constructor(private webhookUrl: string, private auditSink: IAuditSink) {
    if (webhookUrl && !webhookUrl.startsWith('https://')) {
      throw new Error('VALIDATION_ERROR: Webhook URL must be HTTPS');
    }
  }

  async sendAlert(payload: CrisisEvent): Promise<void> {
    // Asynchronous alerting - do not await retries in the main stream
    this.executeWithRetries(payload).catch(console.error);
  }

  private async executeWithRetries(payload: CrisisEvent): Promise<void> {
    const MAX_RETRIES = 5;
    let delayMs = 1000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          return; // Delivery acknowledged
        }
      } catch (err) {
        // Fetch failed (network error)
      }

      if (attempt === MAX_RETRIES) {
        await this.auditSink.logEvent({
          type: 'CRISIS_ALERT_DELIVERY_FAILED',
          severity: 'MAX',
          userId: payload.userId,
          sessionId: payload.sessionId,
          timestamp: new Date().toISOString()
        });
        throw new Error('CRISIS_ALERT_DELIVERY_FAILED: All retry attempts exhausted.');
      }

      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs *= 2; // Exponential backoff
    }
  }
}
