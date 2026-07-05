# Integration Guide

**Purpose:** Guide for educational institutions integrating SAIFE Gateway.
**Audience:** Developer / School Admin
**Status:** Alpha Draft
**Last Updated:** July 6, 2026

## Setup and Deployment Notes

1. **Install:** `npm install saife-gateway`
2. **re2 Build Requirements:** SAIFE Gateway uses `re2` for guaranteed protection against ReDoS attacks. This package compiles native code at install time using `node-gyp`. Ensure your deployment environment has Python 3 and a C++ compiler toolchain (e.g., `build-essential` on Linux) installed.
3. **Fail-Closed Startup:** The Gateway enforces strict configuration checks. If `re2` fails to load, or if any compliance flag in `providerConfig` is missing or invalid, the `SaifeClient` constructor will throw an error and halt your application. This is intentional to prevent accidental deployment of an unsafe configuration.

## Identity Mandate (Backend-Only / JWT)

The Gateway is designed as a backend-to-backend middleware. Client browsers should **never** communicate directly with the Gateway. The integrating LMS (Learning Management System) must authenticate the user (e.g., via strict JWT validation) and pass the guaranteed identity as the `userId` in the `ExecutionContext`. The Gateway trusts the integrating backend implicitly for identity.

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

When a crisis is detected, the Gateway asynchronously calls the `sendAlert(payload: CrisisEvent)` method of your `crisisAlertTransport`.
You must implement this interface to trigger a webhook, email, or SMS to the designated school safeguarding lead. The payload includes:
- `userId`: The student's ID.
- `sessionId`: The current chat session.
- `timestamp`: ISO-8601 string.
- `category`: e.g., "SELF_HARM".

## Exemption Behavior

In this alpha release, the `grantExemption` method is a stub. Exemption persistence is deliberately out of scope for the POC. If a student triggers rate-limit penalties, a teacher cannot currently lift them; the student must wait out the automated decay schedule defined in `RateLimitConfig`.

## Art. 50 AI Act Transparency Disclosure

**MANDATORY FOR ALL INTEGRATORS**

Under Art. 50 of the EU AI Act, end users (students and teachers) must be informed that they are interacting with an AI system. The UI integrating the SAIFE Gateway must render an age-appropriate self-disclosure.

**Example for Students:**
"Du chattest gerade mit einer KI. Sie soll dir beim Lernen helfen."

> [!NOTE]
> [REVIEW: LEGAL / UX] The exact phrasing and prominent UI placement guidelines must be finalized by your legal and UX teams prior to deployment.
