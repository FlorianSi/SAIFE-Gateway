# Design Decisions

![Audience](https://img.shields.io/badge/audience-architects%2Fdevelopers-blue)
![Status](https://img.shields.io/badge/status-active-orange)
![Updated](https://img.shields.io/badge/updated-2026--07--06-lightgrey)
*Architecture Decision Records (ADR) and project rationale.*

This document contains Architecture Decision Records (ADRs) — short, numbered entries that capture an important design decision, the context in which it was made, and its consequences. Read this to understand the "why" behind the Secure AI For Education (SAIFE) Gateway's technical design choices.

## ADR 1: Server-Authoritative History

**Context**
An attacker can manipulate conversation history sent from the client to execute prompt injection or context confusion attacks against the Large Language Model (LLM).

**Decision**
The gateway strictly ignores client-provided history. It reconstructs the conversation state exclusively from the server-side `ISessionStore`.

**Consequences**
Complete immunity to client-side history forgery. Requires maintaining stateful sessions on the server, increasing memory and persistence overhead.

> [!NOTE]
> **Trade-off:** We sacrifice statelessness (and the easy horizontal scaling that comes with it) for a significantly stronger security posture against history forgery.

## ADR 2: Fail-Closed Doctrine

**Context**
Misconfigurations or backend unavailability could result in prompts bypassing safety filters.

**Decision**
Any failure in validation, configuration, or storage defaults to explicitly rejecting the request.

**Consequences**
Guarantees that no unverified prompt reaches the LLM. May lead to temporary service unavailability during configuration errors rather than graceful degradation.

> [!NOTE]
> **Trade-off:** Uptime and availability are explicitly deprioritized in favor of safety guarantees.

## ADR 3: Linear-Time Regex Engine (`re2`)

**Context**
Malicious actors can craft complex regular expressions to trigger Regular Expression Denial of Service (ReDoS) attacks, exhausting CPU resources.

**Decision**
The standard Node.js regex engine is replaced with `re2`, a linear-time execution engine. There is no fallback to the native engine if `re2` fails to load.

**Consequences**
Absolute protection against ReDoS. `re2` requires a native build environment (`node-gyp`), complicating deployment across different architectures.

> [!NOTE]
> **Trade-off:** Deployment complexity is increased to guarantee immunity to ReDoS.

## ADR 4: Crisis-Before-Attack Precedence

**Context**
A student's input could contain both a crisis indicator (e.g., self-harm keywords) and an attack payload.

**Decision**
The crisis classification pipeline evaluates before the attack pipeline.

**Consequences**
Ensures immediate support for a student in crisis. Prevents the rate-limiter from punishing crisis requests. Accepts the theoretical risk of a false-positive crisis triggered by an attacker, which is mitigated by static, non-exploitable responses.

> [!NOTE]
> **Trade-off:** We allow attackers to intentionally trigger the crisis flow, but the impact is contained because the crisis response is static and the LLM is bypassed.

## ADR 5: Persist-First, Respond-Immediately, Alert-Async Crisis Flow

**Context**
In a crisis, the system must reliably record the event, notify authorities, and respond to the student without introducing latency or failing if the alert system is slow.

**Decision**
The system synchronously persists the crisis event, synchronously yields the response to the student, and asynchronously triggers the alert transport.

**Consequences**
The student receives immediate help. The event is safely stored even if the alerting webhook fails. The alert delivery is decoupled from the user's critical path.

## ADR 6: Static Supportive Message in Crisis

**Context**
During a crisis, the LLM might hallucinate, provide inappropriate advice, or be successfully manipulated by an attack payload wrapped in a crisis keyword.

**Decision**
The LLM is bypassed entirely during a crisis. A static, pre-approved supportive message is returned instead.

**Consequences**
Zero risk of harmful AI advice during emergencies. Guaranteed predictable behavior. Removes the ability to provide highly personalized crisis counseling.

> [!NOTE]
> **Trade-off:** We sacrifice AI empathy and conversational flow for absolute clinical predictability.

## ADR 7: No LLM Summarization of History & Server-Side Safety Ledger

**Context**
Long conversations exceed context windows. Using the LLM to summarize past conversations introduces a vector for prompt injection hidden within the summary.

**Decision**
History summarization via LLM is banned. History is truncated by count. Safety infractions (refusals) are tracked in a secure ledger (`[SAFETY_LEDGER: PRIOR_REFUSALS=N]`) injected by the server.

**Consequences**
Eliminates summarization-based injection attacks. Enforces strict pedagogical penalties via server state.

## ADR 8: ID-Based Focus Topics with Reject-at-Config Validation

**Context**
Allowing teachers to define focus topics using free-text introduces a vector for indirect prompt injection.

**Decision**
Focus topics must be passed as strict alphanumeric IDs mapping to definitions. The gateway rejects configuration outright if invalid characters (e.g., `<` or `>`) are detected.

**Consequences**
Prevents metadata-based injection. The frontend and backend must synchronize topic IDs.

> [!NOTE]
> **Trade-off:** System flexibility is reduced; integrating platforms must use our predefined lookup tables rather than arbitrary topics.

## ADR 9: Truncation by Message Count

**Context**
Managing token limits accurately requires embedding a tokenizer, which is computationally expensive and model-specific.

**Decision**
The gateway truncates history by a strict message count (e.g., keeping the last 10 messages) rather than precise token calculations.

**Consequences**
Significantly improves performance and model-agnosticism. May occasionally truncate more context than strictly necessary.

> [!NOTE]
> **Trade-off:** We lose token-level optimization precision in exchange for CPU efficiency and provider portability.

## ADR 10: Counts-Only Telemetry

**Context**
Collecting detailed usage logs for dashboards risks exposing PII or sensitive student queries.

**Decision**
The telemetry sink only records aggregated, anonymous counts (e.g., total requests, total rejections).

**Consequences**
Complies strictly with data minimization principles. Prevents deep qualitative analysis of student interactions from telemetry alone.

## ADR 11: Generic Client Error Messages

**Context**
Verbose error messages can provide attackers with an oracle to probe the exact nature of the security filters.

**Decision**
All security rejections return a generic error (e.g., "This request can't be processed.").

**Consequences**
Frustrates iterative filter probing attacks. May slightly reduce user experience for legitimate but accidental violations.

> [!NOTE]
> **Trade-off:** User Experience (UX) is degraded for the sake of security obfuscation.

## ADR 12: Deliberate Scope Cuts (POC)

**Context**
To deliver a secure alpha, complex or high-risk features were deferred.

**Decision**
The following features are out of scope:
- **Research Export:** Deferred due to consent and anonymization complexities.
- **Struggle Tracking:** Deferred to minimize complex state management.
- **Exemption Persistence:** Exemptions only last for the current ephemeral session.
- **Guard-Engine Microservice:** Only the lightweight, regex-based internal engine is enabled.

**Consequences**
The initial release is highly focused, secure, and easier to audit, but lacks advanced pedagogical and analytical features. *(See also: [Honest Assessment](HONEST_ASSESSMENT.md))*
