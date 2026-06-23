# SAIFE Security, Privacy & Policy Brief
**Version:** 4.0.1  
**Target Audience:** State-Level Data Protection Officers (Datenschutzbeauftragte der Länder), Certification Bodies (e.g., BSI), and System Operators.  
**Scope:** EU AI Act Compliance, GDPR (DSGVO) Alignment, and BSI Grundschutz Application.

## Executive Summary
This document outlines the security architecture and data protection mechanisms of the SAIFE Gateway (Safe AI Framework for Education). It provides the legal, technical, and operational facts necessary for drafting legally compliant Privacy Policies (Datenschutzerklärungen) and conducting Data Protection Impact Assessments (DPIA / DSFA). 

> [!WARNING]
> In the rapidly evolving domain of Large Language Models (LLMs), absolute security and waterproof data protection cannot be completely guaranteed. SAIFE implements state-of-the-art defense-in-depth mechanisms to mitigate foreseeable risks, but operates under the premise of continuous review and real-world adaptation.

## 1. Data Protection & Privacy (GDPR / DSGVO)

### 1.1 Data Flows and Processing Perimeter
Operators must ensure that end-user (student) interactions are processed in a transparent, minimally invasive manner. 
- **Transient Processing:** By default, the SAIFE Gateway processes student inputs in memory for real-time pedagogical evaluation and security gating. 
- **Data Minimization:** No personal data is required to operate the SAIFE pedagogical layer. Operators are strictly advised to use pseudonymous session IDs.

### 1.2 Differential Privacy in Analytics
To facilitate pedagogical research and system optimization without compromising student privacy, SAIFE incorporates Differential Privacy mechanisms. 
- **Mathematical Guarantees:** SAIFE applies Laplacian noise to session telemetry before it is aggregated for analysis. This provides strong mathematical guarantees against reverse-engineering or isolating individual student data.
- **Statistical Trends over Exactness:** It is a fundamental principle of Differential Privacy that the added noise introduces controlled inaccuracy. Therefore, while individual records are mathematically obscured, researchers can observe reliable aggregate statistical trends when analyzing a sufficiently large cohort. The system does not yield "perfectly accurate averages," but rather statistically useful insights with mathematically proven privacy bounds.

## 2. Security Architecture & Threat Mitigation (EU AI Act & BSI Grundschutz)

### 2.1 Prompt Injection Defense-in-Depth
A core risk in educational AI is the manipulation of model instructions via user input (Prompt Injection). 
- **Role Separation Convention:** SAIFE strictly routes teacher policies to the `system` role and student inputs to the `user` role. By leveraging API-native conventions enforced at the model level, SAIFE significantly reduces the attack surface. 
- **No Absolute Hardware Guarantees:** This role separation is a strong defense-in-depth API convention, not an absolute, hardware-enforced boundary (such as OS privilege rings). Because underlying foundational models may change how they weight system vs. user prompts, SAIFE supplements this convention with the Pre-Flight Gate and continuous context inspection.

### 2.2 Crisis Detection and Fallback Mechanisms
SAIFE employs a multi-layered approach to detect and mitigate policy violations and potential crises (e.g., self-harm disclosures or severe harassment).
- **Primary Layer (Pre-Flight Gate):** Operates before text generation begins, actively inspecting inputs and blocking LLM calls entirely if critical thresholds are breached.
- **Secondary Layer (Tool-Call Fallback):** If an edge-case bypasses the Pre-Flight Gate, the main LLM is equipped with a `trigger_crisis_protocol()` tool. This acts strictly as a **best-effort secondary signal**. It is not a co-equal safety layer or equivalent redundancy to the Pre-Flight Gate, as its reliability is bounded by the model's own adversarial resistance and requires the model to correctly identify the crisis within its own context window.

## 3. The "Equal Security" Guarantee
To comply with public-sector procurement standards and ensure equitable protection across all educational institutions, SAIFE ensures a uniform baseline of security.

### 3.1 Uniform Policy Enforcement
Every student, regardless of the school's infrastructure or budget, receives the exact same state-of-the-art AI protection logic. The foundational Layer 1 security policies and the mandatory Chunk-Gate inspection levels remain mathematically and operationally identical across all deployments.

### 3.2 The Enterprise Upgrade (`@saife/guard-engine`)
The optional `@saife/guard-engine` microservice does not introduce a higher "tier" of security policy or inspection depth. Instead, it is strictly a **performance and latency optimization**. 
- **Lightweight Default:** Executes the mandatory security checks synchronously within the standard application environment.
- **Enterprise Upgrade:** Offloads the exact same mandatory security checks to a dedicated, Dockerized gRPC microservice, allowing high-throughput institutions to reduce latency. The underlying policy, threat modeling, and minimum security inspection remain identical. There is no "two-class" security model in SAIFE.

## 4. Operational Requirements for System Operators

When drafting a Privacy Policy (Datenschutzerklärung) for a SAIFE-powered deployment, operators must include:
1. **Purpose of Processing:** Real-time evaluation of educational inputs.
2. **Anonymization Strategy:** Explicit mention of Differential Privacy (Laplacian noise) for any retained analytics.
3. **Third-Party Disclosures:** If the deployment routes prompts to external LLM providers (e.g., OpenAI, Anthropic), operators must secure Data Processing Agreements (AVVs) with those vendors and disclose the data flow.
4. **Retention Policies:** Chat histories should be subject to strict TTL (Time-To-Live) constraints and purged after the pedagogical session concludes, unless explicitly opted into for research under Differential Privacy protocols.

---
*Document prepared by SAIFE Compliance & DPO Office.*
