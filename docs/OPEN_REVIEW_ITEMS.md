# Open Review Items

![Audience](https://img.shields.io/badge/audience-auditors%2Fmaintainers-blue)
![Status](https://img.shields.io/badge/status-active-orange)
![Updated](https://img.shields.io/badge/updated-2026--07--06-lightgrey)
*Pending expert reviews and blocking items for production.*

This document tracks all outstanding expert reviews and tasks that must be completed before the SAIFE Gateway can be used in a production environment with real students. Read this to understand the remaining blockers and to claim responsibility for an open item.

This gateway is an alpha. The following expert reviews are pending; until the blocking items are signed off, it must not be used with real students.

| ID | Item | What is needed | Responsible Expertise | Blocking for Production |
|---|---|---|---|---|
| `CRISIS-WORDING` | Crisis Supportive Message | Review and finalize the supportive message text displayed to students when a crisis is detected. | Child Psychologist | Yes |
| `CRISIS-PATTERNS` | Crisis Detection Patterns | Validate the primary German pattern set used by the placeholder regex classifier. | Child Psychologist & Machine Learning (ML) Engineer | Yes |
| `DPO-CRISIS-RETENTION` | Crisis Record Deletion Exception | Confirm if crisis records should be strictly excluded from standard user deletion requests. | Data Protection Officer (DPO) | Yes |
| `LEGAL-AVV-TOMS` | Data Processing Agreement (AVV) & TOMs | Finalize the AVV basis and insert specific Technical and Organizational Measures (TOMs) required for deployment. | School Law Counsel | Yes |
| `DPIA-SIGNOFF` | DPIA/DSFA & FRIA | Complete and sign off the Data Protection Impact Assessment (DPIA) / Datenschutz-Folgenabschätzung (DSFA) and Fundamental Rights Impact Assessment (FRIA). | DPO | Yes |
| `TRANSPARENCY-POLICY` | Privacy Policy Template | Complete the privacy policy template and insert school-specific contact details. | DPO | Yes |
| `TRANSFER-ASSESSMENT` | Data Transfers | Conduct a Transfer Impact Assessment (TIA) if a non-EU endpoint is configured. | DPO | Yes |
| `SECURITY-AUDIT` | External Security Review | Perform an external security review (Pentest / Audits) on the gateway implementation. | Security Engineer | Yes |
| `ROSTER-REDACTION` | Roster Redaction | Review the roster-redaction exclusion policies. | DPO | No |
| `ROSTER-AUTHZ` | Roster Provider | Implement the `IRosterProvider` authorization logic (currently a stub). | Architect / LMS Integration | Yes |
| `PERSISTENT-STORES` | Persistent State Storage | Replace in-memory stores with production-ready persistent storage solutions. | Architect | Yes |
| `TEACHER-TRAINING-TELEMETRY` | Teacher Briefing | Conduct teacher awareness and training on dashboard telemetry. | School Admin | No |
| `TEACHER-TRAINING-EXEMPTIONS` | Penalty Exemption Briefing | Conduct teacher awareness and training on exemption limits. | School Admin | No |
| `GERMAN-DOCS` | German Documentation | Produce German-language documentation (README, SECURITY, INTEGRATION_GUIDE) from current docs. | School Admin / translator | No (Required before teacher/parent-facing rollout) |
| `AUDIT-CHAIN-TAMPER-TEST` | Audit Chain Tamper Test | Add a direct unit test proving HashChainedAuditSink detects tampering (altered or removed entries break the chain from that point forward) | Security Engineer | No |
