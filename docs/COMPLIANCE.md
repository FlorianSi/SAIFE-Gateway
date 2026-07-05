# Compliance Posture (GDPR & EU AI Act)

This document outlines the SAIFE Gateway's compliance posture, written specifically for school Data Protection Officers (DPOs). It details how data is handled, stored, and exported, as well as the deployer's responsibilities under the EU AI Act.

## Data Categories and Retention

In accordance with the principle of data minimization (Art. 5(1)(c) GDPR), the Gateway operates predominantly on transient, ephemeral state.

| Data Category | Purpose | Storage Location | Retention Schedule |
|---|---|---|---|
| **Chat History** | Contextual awareness for the LLM and Salami-attack inspection. | `ISessionStore` | Transient (e.g., 7-day grace period post-session, configurable). |
| **Penalty Buckets** | Rate-limiting and tracking repeated safety infractions. | `ISessionStore` | 24 Hours. |
| **Crisis Events** | Safeguarding student welfare and enabling external alerts. | `ICrisisStore` | Managed strictly by school policy (e.g., 12 months) under Art. 9 exceptions. |
| **Telemetry** | Anonymous usage metrics for school dashboards. | `ITelemetrySink` | Aggregated counts only; no PII retained. |
| **Roster / PII** | Used in-memory for redaction before sending data to external APIs. | Memory only (Transient) | Dropped immediately after request processing. |

## Legal Basis & Art. 9 Data

- **General Processing:** Processing is generally based on public interest/educational mandate (Art. 6(1)(e) GDPR) or consent, depending on the jurisdiction's specific educational laws.
- **Crisis Records (Art. 9):** If a student expresses intent of self-harm, the message is classified as a crisis event. This data often falls under special categories (health data). Processing is strictly gated behind vital interests (Art. 9(2)(c) GDPR) or substantial public interest. Crisis records are isolated in the `ICrisisStore` and are strictly excluded from automated standard deletion requests to preserve necessary safeguarding records, pending specific DPO review.

## Erasure and Export APIs

To comply with Data Subject Rights:
- **Right to Erasure (Art. 17):** The SDK exposes `deleteUserData(userId)`. This instantly purges all chat history and penalty tokens from the `ISessionStore` and `ITelemetrySink`.
- **Right of Access (Art. 15):** The SDK exposes `exportUserData(userId)`, returning a comprehensive JSON object containing all session histories and logged crisis events associated with the user.

## EU AI Act High-Risk Classification

Under the EU AI Act, AI systems used in education and vocational training (e.g., determining access or evaluating learning outcomes) are typically classified as **High-Risk**. The SAIFE Gateway provides the necessary controls, transparency, and logging to help schools meet these rigorous standards.

### Deployer Responsibilities
While the SAIFE Gateway provides the technical foundation, the **Deployer (the School/Institution)** retains critical legal responsibilities:

1. **DPIA / DSFA:** The school must complete a Data Protection Impact Assessment. See our template: [SAIFE_Data_Protection_Impact_Assessment.md](compliance/SAIFE_Data_Protection_Impact_Assessment.md).
2. **DPA / AVV:** A Data Processing Agreement must be signed with the underlying LLM provider. See our template: [SAIFE_AVV_Template.md](compliance/SAIFE_AVV_Template.md).
3. **Transfer Assessment (TIA):** If the configured LLM endpoint resides outside the EU, the school must conduct a Transfer Impact Assessment.
4. **Transparency & Art. 50 Disclosure:** Under the AI Act, users must be informed they are interacting with an AI. The school's integrating UI must explicitly display this disclosure. See our policy template: [SAIFE_Privacy_Policy_Template.md](compliance/SAIFE_Privacy_Policy_Template.md).
