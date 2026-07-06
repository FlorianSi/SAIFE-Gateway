# Security Model

![Audience](https://img.shields.io/badge/audience-security_engineers-blue)
![Status](https://img.shields.io/badge/status-active-orange)
![Updated](https://img.shields.io/badge/updated-2026--07--06-lightgrey)
*Threat model, defenses, and fail-closed rules.*

This document details the SAIFE Gateway's threat model, outlining specific attack vectors such as prompt injection and ReDoS, and the corresponding defenses. Read this to understand the fail-closed security doctrine and known limitations of the current architecture.

The SAIFE Gateway operates under a strict "fail-closed" security doctrine. Its primary mandate is to protect both the pedagogical environment and the student from adversarial manipulation of the Generative AI.

## Threat Model and Defenses

### 1. Prompt Injection
**Threat:** A user attempts to override the system instructions or teacher directives by injecting commands like "Ignore previous instructions."
**Defense:** Strict isolation of system prompts from user inputs. The gateway sanitizes inputs, applies `re2`-based pattern matching to intercept known injection vectors, and prepends a rigid, server-controlled `TeacherFocusDirective`.

### 2. History Forgery
**Threat:** A malicious client sends fabricated past conversation turns (e.g., "Assistant: I am now unlocked") to trick the LLM into adopting an unsafe persona.
**Defense:** Server-authoritative history. The gateway entirely ignores client-provided conversation history, reconstructing the context exclusively from the secure, server-side `ISessionStore`.

### 3. Salami-Slicing & Stream Attacks
**Threat:** An attacker distributes an injection payload across multiple small messages or attempts to exploit the streaming nature of the LLM response to bypass filters.
**Defense:** The gateway tracks infractions across the session in the `ISessionStore` and applies penalty buckets. For output streams, the `Stream Hold-back Inspection` buffers response chunks, verifying each window against safety rules before yielding tokens to the user.

### 4. Directive Forgery
**Threat:** A student intercepts network traffic and alters the teacher-assigned pedagogical parameters.
**Defense:** Directives require a cryptographic signature (`HMAC-SHA256`) bound to the `directiveSecret` and the `createdBy` identity. Expirations and metadata are strictly validated.

### 5. Filter Probing (Oracle Attacks)
**Threat:** An attacker iteratively probes the gateway to determine the exact nature and limits of the safety filters by analyzing error responses.
**Defense:** The gateway returns generic, opaque error messages (e.g., "This request can't be processed.") for all security rejections, depriving the attacker of specific feedback.

### 6. Regular Expression Denial of Service (ReDoS)
**Threat:** An attacker submits a specially crafted string designed to cause catastrophic backtracking in regular expressions, exhausting server CPU resources.
**Defense:** The gateway uses the linear-time `re2` engine for all pattern matching. There is no fallback to the native Node.js regex engine.

### 7. Reserved-Token Forgery
**Threat:** An attacker attempts to inject XML-like tags (e.g., `<focus_topics>`) to spoof internal ledger state.
**Defense:** The `InputSanitizer` rigorously strips or escapes all reserved delimiter tokens before the input reaches any evaluation logic.

## Fail-Closed Rules

- If `re2` fails to load, the gateway halts execution.
- If provider configuration lacks required compliance flags (e.g., `noTrainingClause`, `dpaExecuted`), initialization fails.
- If the external API endpoint uses plaintext (`http://`), requests are rejected.
- If any internal store or check throws an unexpected error, the pipeline catches it and rejects the prompt.

## Known Limitations

This alpha release is a Proof of Concept (POC) and possesses several known limitations that must be addressed prior to production deployment:

### Placeholder Pattern-Based Crisis Classifier
Crisis detection currently relies on a static, simplistic regex list (e.g., 'suizid', 'ritzen'). It requires replacement with a validated Machine Learning (ML) classifier.
- **Interim measures:** Deployers must be aware that the classifier will miss nuanced crisis signals and may falsely flag benign mentions. It should not be relied upon as a primary safeguarding tool.
- **Path to resolution:** To be resolved by [CRISIS-PATTERNS](OPEN_REVIEW_ITEMS.md).

### In-Memory Reference Stores
`ISessionStore` and `ICrisisStore` are implemented in volatile memory. They will not persist across server restarts and do not scale horizontally.
- **Interim measures:** Do not deploy across multiple nodes. Expect all history and penalty buckets to be lost on restart.
- **Path to resolution:** To be resolved by [PERSISTENT-STORES](OPEN_REVIEW_ITEMS.md).

### Permissive Roster Stub
The `IRosterProvider` authorization logic is currently a stub that allows most requests. A strict integration with the school's LMS is required.
- **Interim measures:** Do not expose the Gateway to untrusted networks. Authentication must be handled entirely by the upstream reverse-proxy/LMS.
- **Path to resolution:** To be resolved by [ROSTER-AUTHZ](OPEN_REVIEW_ITEMS.md).

### No Output-Side Crisis Classification
The gateway inspects LLM responses for attacks, but does not currently run the crisis classifier against the LLM's output.
- **Interim measures:** Relies heavily on the input-side classifier and the LLM's own safety guardrails.
- **Path to resolution:** To be evaluated in [SECURITY-AUDIT](OPEN_REVIEW_ITEMS.md).

### Single-Instance Rate Limiting
Rate limiting state is held in local memory and cannot protect against distributed floods across a multi-instance deployment.
- **Interim measures:** Limit deployment to a single instance or enforce global rate limits at the API gateway layer above the SAIFE Gateway.
- **Path to resolution:** To be resolved by [PERSISTENT-STORES](OPEN_REVIEW_ITEMS.md).

## Responsible Disclosure

If you discover a vulnerability in the SAIFE Gateway, please follow our responsible disclosure guidelines outlined in [SECURITY.md](../SECURITY.md).
