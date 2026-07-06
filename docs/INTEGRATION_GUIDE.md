# Integration Guide

![Audience](https://img.shields.io/badge/audience-developers%2Fadmins-blue)
![Status](https://img.shields.io/badge/status-alpha-orange)
![Updated](https://img.shields.io/badge/updated-2026--07--06-lightgrey)
*Guide for educational institutions integrating SAIFE Gateway.*

This document provides the definitive integration contract for the Secure AI For Education (SAIFE) Gateway. It is intended for software developers and system administrators who need to install, configure, and integrate the Gateway within their school's existing infrastructure. Read this to understand how to fulfill the mandatory interfaces for storage, telemetry, and crisis alerting.

## Setup and Deployment Notes

1. **Install:** `npm install saife-gateway`
2. **re2 Build Requirements:** SAIFE Gateway uses `re2` for guaranteed protection against Regular Expression Denial of Service (ReDoS) attacks. This package compiles native code at install time using `node-gyp`. Ensure your deployment environment has Python 3 and a C++ compiler toolchain (e.g., `build-essential` on Linux) installed.
3. **Fail-Closed Startup:** The Gateway enforces strict configuration checks. If `re2` fails to load, or if any compliance flag in `providerConfig` is missing or invalid, the `SaifeClient` constructor will throw an error and halt your application. This is intentional to prevent accidental deployment of an unsafe configuration.

## Identity Mandate (Backend-Only / JWT)

The Gateway is designed as a backend-to-backend middleware. Client browsers should **never** communicate directly with the Gateway. The integrating Learning Management System (LMS) must authenticate the user (e.g., via strict JSON Web Token (JWT) validation) and pass the guaranteed identity as the `userId` in the `ExecutionContext`. The Gateway trusts the integrating backend implicitly for identity.

## `SaifeClientConfig` Reference

When initializing `SaifeClient`, you must provide the following configuration object:

- `apiKey` (string): The API key for the underlying Generative AI provider.
- `focusTopics` (Record<string, string>): A mapping of topic IDs to their descriptive names (e.g., `{'MATH_01': 'Algebra Basics'}`). The frontend should only send IDs.
- `sessionStore` (ISessionStore): Your implementation of the persistent state store for history and rate limiting.
- `crisisStore` (ICrisisStore): Your implementation for persisting crisis events.
- `auditSink` (IAuditSink): Your implementation for secure security logging.
- `telemetrySink` (ITelemetrySink): Your implementation for anonymous usage counting.
- `crisisAlertTransport` (ICrisisAlertTransport): Your implementation for dispatching asynchronous crisis alerts.
- `redactionProvider` (IRedactionProvider): Your implementation for stripping PII before egress.
- `chunkSizeTokens` (number): The maximum size of the hold-back stream window.
- `providerConfig` (ProviderConfig): Compliance flags including `dpaExecuted`, `transferBasis`, `noTrainingClause`, and `endpointRegion`.

## `.env.example` Walkthrough

The `.env.example` file contains standard configuration keys:
- `AI_ENDPOINT`: The remote LLM URL.
- `AI_API_KEY`: The LLM authorization key.
- `GUARD_ENGINE_ENDPOINT`: (Optional) Remote mTLS URL for advanced classification if you are not using the lightweight default.
- `DIRECTIVE_SECRET`: A secure random string (HMAC-SHA256) used to cryptographically sign TeacherFocusDirectives, preventing student forgery.

## Webhook Contract for Crisis Alerts

When a crisis is detected, the Gateway asynchronously calls the `sendAlert(payload: CrisisEvent)` method of your `ICrisisAlertTransport`.
You must implement this interface to trigger a webhook, email, or SMS to the designated school safeguarding lead.

**Payload Schema:**
```json
{
  "userId": "student123",
  "sessionId": "session456",
  "timestamp": "2026-07-06T10:00:00Z",
  "category": "SELF_HARM"
}
```
- `userId` (string): The student's ID.
- `sessionId` (string): The current chat session.
- `timestamp` (string): ISO-8601 string representing the exact time of detection.
- `category` (string): The category of the crisis. The current classifier emits only `SELF_HARM`. The field is an enum to allow future categories; integrators MUST handle unknown values gracefully (log + escalate to a human, never drop).

**Delivery Semantics:**
- **Retries & Backoff:** The default `WebhookCrisisTransport` attempts delivery up to 5 times, using an exponential backoff starting at 1000ms.
- **Acknowledgment:** The transport expects an HTTP 2xx response.
- **Failure Escalation:** If all 5 retry attempts are exhausted without acknowledgment, the Gateway logs an event of type `CRISIS_ALERT_DELIVERY_FAILED` with `severity: 'MAX'` to the `IAuditSink` and throws an error.
- **Deduplication:** The `ICrisisStore` enforces deduplication; only one alert per session per category is emitted (`hasCategoryThisSession`).

## Interface Contracts

Integrators must provide implementations for the following interfaces defined in `src/types.ts`:

- **`ISessionStore`**: Manages ephemeral conversation state and rate-limit penalties.
  - `getHistory(sessionId: string)` / `saveHistory(sessionId: string, messages: ConversationMessage[])`: Persist and retrieve chat history. History is retained for 7 days (grace period post-session) before eviction.
  - `addToPenaltyBucket(userId: string, seconds: number)` / `getPenalty(userId: string)`: Track rate-limit penalties, which have a 24-hour Time to Live (TTL).
  - `verifyTeacherRoster(teacherId: string, studentId: string)`: Verify authorization.
  - `clearUserData(userId: string)` / `exportUserData(userId: string)`: Fulfill GDPR requests.

- **`ICrisisStore`**: Stores highly sensitive crisis records.
  - `saveCrisisEvent(event: CrisisEvent)`: Persist a crisis event. Must retain for 12 months.
  - `deleteUserData(userId: string, allowExemptionDeletion?: boolean)`: Deletion is restricted for safeguarding reasons.

- **`IRosterProvider`**: Resolves authorization between teachers and students.
  - Currently a stub. Must be implemented to connect to the school's LMS.

- **`IRedactionProvider`**: Strips Personally Identifiable Information (PII) from prompts.
  - `redact(text: string)`: Returns the sanitized string. Must execute synchronously before egress.

- **`ITelemetrySink`**: Records anonymous usage metrics.
  - `logEvent(event: { type: string, count: number, categoryCode: string, userId?: string })`: Logs aggregated counts. Data has a 30-day Time to Live (TTL).

- **`IAuditSink`**: The append-only, hash-chained ledger for security and Art. 12 logging.
  - `logEvent(event: any)`: Write a log entry. Must retain records for a minimum of 6 months.

## Exemption Behavior

In this alpha release, the `grantExemption` method is a stub. Exemption persistence is deliberately out of scope for the POC. If a student triggers rate-limit penalties, a teacher cannot currently lift them; the student must wait out the automated decay schedule defined in `RateLimitConfig`.

## Art. 50 AI Act Transparency Disclosure

**MANDATORY FOR ALL INTEGRATORS**

Under Art. 50 of the EU AI Act, end users (students and teachers) must be informed that they are interacting with an AI system. The UI integrating the SAIFE Gateway must render an age-appropriate self-disclosure.

**Example for Students:**
"You are chatting with an AI. It is designed to help you learn."

> [!NOTE]
> Deployments must present student-facing text in the students' language; the German crisis-support message in the source code is intentional for the initial German deployment context and is pending expert review (CRISIS-WORDING). The exact phrasing and prominent UI placement guidelines must be finalized by your legal and UX teams prior to deployment.
