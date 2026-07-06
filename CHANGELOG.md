# Changelog

![Audience](https://img.shields.io/badge/audience-developers%2Fusers-blue)
![Status](https://img.shields.io/badge/status-active-orange)
![Updated](https://img.shields.io/badge/updated-2026--07--06-lightgrey)
*Chronological record of all notable changes.*

This document maintains a chronological record of all notable changes to the Secure AI For Education (SAIFE) Gateway project. Read this to understand what new features, fixes, and breaking changes are introduced in each release version.

## [Unreleased]

### Fixed
- Re-added the documentation claim for the 30-day `expiresAt` maximum TTL enforcement on `TeacherFocusDirective`, properly citing its runtime enforcement location in `src/SaifeClient.ts` instead of `src/types.ts`.

## [0.1.0-alpha.1] - 2026-07-06

### Added
- Initial alpha release of SAIFE Gateway integrating crisis interception and attack filtering.
- Established transient, in-memory state architecture for compliance with strict data minimization standards.
- Designed pre-egress Personally Identifiable Information (PII) redaction rules to prevent unauthorized leaks to external Large Language Model (LLM) providers.
- Integrated fail-closed mechanism for `re2` constraints to prevent Regular Expression Denial of Service (ReDoS) on injection vectors.
