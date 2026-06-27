# Data Protection Impact Assessment (DPIA) according to Art. 35 GDPR
**Project:** SAIFE Gateway – Telemetry & Pedagogical Focus Directives
**Date:** June 24, 2026
**Status:** Active

*Note: SAIFE Gateway is middleware; the final legal responsibility (Data Controller) lies with the deploying educational institution. Absolute security and complete error-freedom cannot be guaranteed in AI-supported systems; the measures described here aim at the best possible risk minimization (best-effort).*

## 1. Systematic Description of Processing Operations
The SAIFE Gateway integrates two functions that involve the processing of personal data (particularly of minors):
*   **Dashboard Telemetry & StruggleTracker:** A stateless tracker counts consecutive failed attempts by a student within a session in volatile memory. If a threshold (`struggle_threshold`) is exceeded, the Gateway emits a warning signal (recommendation) to the teacher dashboard. Additionally, session data (such as Session ID and turn index) are transmitted to better contextualize learning progress.
*   **Pedagogical Focus Directives (Focus Directives):** Teachers can define specific learning focus instructions for individual students via the dashboard (e.g., "Fractions"). These are transmitted by the school LMS as parameters (DslConfig) to the Gateway and temporarily influence the behavior of the AI system.

## 2. Purpose and Legal Basis
The processing serves pedagogical support and the targeted guidance of students in the digital learning environment.
For public schools, Art. 6(1)(e) GDPR (performance of a task carried out in the public interest), in conjunction with specific state school laws, typically serves as the legal basis. For the tracking and profiling of minors, explicit consent (Art. 6(1)(a), Art. 8 GDPR) of the parents/guardians may be mandatory instead, depending on state law.

## 3. Assessment of Necessity and Proportionality
In accordance with the principle of data minimization (Art. 5(1)(c) GDPR), the architecture implements the following restrictions:
*   **No persistent storage in the Gateway:** The SAIFE Gateway does not store focus directives or session data locally on the hard disk (stateless architecture).
*   **Milestone events instead of per-turn tracking:** To make the creation of granular behavioral profiles more difficult, the Gateway by default only emits significant pedagogical milestones (e.g., detected struggle, learning progress). Continuous per-turn tracking is only intended as an explicit opt-in and requires independent justification by the operator.
*   **Mandatory expiration date (TTL) for directives:** Focus directives receive a mandatory expiration date (`expiresAt`, maximum of 30 days) to reject the unintended accumulation of outdated pedagogical evaluations.

## 4. Risk Assessment (Rights and Freedoms of Data Subjects)
Since vulnerable persons (children) are involved, the risk is fundamentally classified as high if protective measures are insufficient:
*   **Risk 1: Behavioral profiling and automated decision-making (Art. 22 GDPR).** An automatic, unverified adjustment of the AI to a "struggle" recognized by the system could act as an algorithmic misevaluation and negatively influence the child's learning path.
*   **Risk 2: Prompt injection via focus directives.** Manipulated or insufficiently verified inputs (e.g., XML tags in free-text fields) could bypass AI safety rules and expose the child to unwanted content.
*   **Risk 3: Re-identification through session fingerprinting.** The combination of Session ID, duration, and specific learning topics could allow third parties (e.g., in the research stream) to re-associate anonymized data with a student through correlation attacks.
*   **Risk 4: Processing of sensitive data.** Free-text fields in pedagogical instructions carry the risk of accidentally processing health data (e.g., "dyslexia"), which is subject to the strict protection requirements of Art. 9 GDPR.

## 5. Planned Measures for Risk Mitigation
To reduce the described risks to a legally and ethically acceptable level, the Gateway implements the following technical and organizational measures (TOMs):
*   **Regarding Risk 1 (Advisory-Only & Human-in-the-Loop):** The `StruggleTracker` does *not* make autonomous decisions. It merely emits a recommendation to the dashboard (`is_formative_only: true`). The teacher must review and proactively confirm this before the AI changes its pedagogical course.
*   **Regarding Risk 2 & 4 (Strict Sanitization Regex):** To accommodate educational federalism, the Gateway allows dynamic topic designations from the LMS. However, it enforces a strict Zod validation schema (regex) at runtime: only alphanumeric characters and spaces are allowed. Any special characters, XML tags, or typical injection patterns are technically blocked, eliminating any compromise of the system prompt. Operators are obligated not to transmit Art. 9 data (health data) as topic designations.
*   **Regarding Risk 3 (Strict Stripping in the Research Stream):** The architecture enforces a dedicated, reduced data type (`Stream2SafeContext`). Metadata such as `sessionId`, `turnIndex`, or specific topics are discarded at the code level during export to the research stream to rule out re-identification as far as possible.
*   **Limitation of Model Guarantees:** The operator must make it transparent in the UI that the "learning progress" signal is largely evaluated by the LLM. LLMs are prone to hallucinations or "sycophancy" (saying what the user wants to hear). The signal represents merely a heuristic and can never replace a well-founded performance evaluation by qualified teaching staff.
