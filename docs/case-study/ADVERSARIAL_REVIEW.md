**Purpose:** Adversarial review.
**Audience:** Security Engineer / Reviewer
**Status:** Evidence
**Last Updated:** July 4, 2026

# Adversarial Review of SaifeClient.ts Edge Cases

Executed by Verification Engineer Sub-agent against current codebase (docs 03, 04 mapped to doc 05 logic).

## 1. Sliding-window straddling attack (A1/A2)
*   **Input Provided:** A payload where a violating string ("bad_chunk") is injected, testing if tokens leak to the client before detection.
*   **Observed Behavior:** The `holdBackBuffer` array strictly retains 200 chunks. When the attack string enters the buffer, it is detected by `new RE2(/bad_chunk/i).test(windowText)`. The system throws `PRE_FLIGHT_REJECTION` *before* `yieldedChunks` can increment for the malicious tokens.
*   **Result:** **PASSED**. Zero tokens yielded before termination. The policy-violating token never reaches the client.

## 2. HMAC Tampering
*   **Input Provided:** A validly signed directive where the attacker modifies one field (`expiresAt`) *after* the signature was computed.
*   **Observed Behavior:** The payload string mismatch causes the HMAC calculation to produce a different hash.
*   **Result:** **PASSED**. The signature check catches it and throws `INVALID_DSL_CONFIG` ("Directive signature mismatch").

## 3. Oracle Check
*   **Input Provided:** Simulating a rate-limit rejection (which fails fast via the penalty bucket) versus a pre-flight rejection (hitting the attack regex with "salami").
*   **Observed Behavior:** In both scenarios, the system returns an identical `PRE_FLIGHT_REJECTION` error with the exact message: `"This request can't be processed."`
*   **Result:** **PASSED**. Rate-limit rejection and pre-flight rejection return indistinguishable messages to the client, preventing oracle attacks.

## 4. Crisis-beats-attack Precedence
*   **Input Provided:** A single input crafted to trip both classifiers (e.g. `"salami suizid"`).
*   **Observed Behavior:** The crisis classifier `RE2` instance runs *first*. Upon matching the crisis pattern, the loop immediately yields the static supportive message and terminates. It ignores the attack payload, avoiding rate-limit escalation (`addToPenaltyBucket` is not called).
*   **Result:** **PASSED**. Crisis takes precedence over attack, verified adversarially.

## 5. Teacher Spoofing (createdBy Bound to Authenticated Identity)
*   **Input Provided:** A teacher authenticated as `teacher-A` (`teacherCtx.userId`) submits a mathematically valid, properly HMAC-signed directive, but sets `createdBy: "teacher-B"`.
*   **Observed Behavior:** The newly added explicit check `directive.createdBy !== teacherCtx.userId` runs *before* roster lookup.
*   **Result:** **PASSED**. The system correctly intercepts the request and throws `SaifeError('INVALID_DSL_CONFIG', 'Directive createdBy identity mismatch')`, preventing teachers from issuing directives in another teacher's name.

## 6. `validateDirective` with `expiresAt` set to `"banana"`
*   **Input Provided:** A `TeacherFocusDirective` where `expiresAt` is set to the non-date string `"banana"`.
*   **Observed Behavior:** The application attempts to call `Date.parse("banana")`, which returns `NaN`.
*   **Result:** **PASSED**. The function safely rejects the malformed date string.

## 7. `executeStream` ignoring client-supplied history
*   **Input Provided:** Client attempts to forge history via `executeStream`.
*   **Observed Behavior:** The signature only accepts `ExecutionContext` and loads from `sessionStore.getHistory(ctx.sessionId)`.
*   **Result:** **PASSED**. Client-supplied history is structurally ignored.

## 8. Roster Check (Directive for Another Student)
*   **Input Provided:** A verified teacher submits a valid directive but assigns it to a `studentId` not on their roster.
*   **Observed Behavior:** `verifyTeacherRoster` evaluates to `false`.
*   **Result:** **PASSED**. The function throws "Teacher not authorized for this student".

