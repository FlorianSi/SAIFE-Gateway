# Contributing to Secure AI For Education (SAIFE) Gateway

![Audience](https://img.shields.io/badge/audience-developers%2Fresearchers-blue)
![Status](https://img.shields.io/badge/status-active-orange)
![Updated](https://img.shields.io/badge/updated-2026--07--06-lightgrey)
*Guidelines for contributing to the SAIFE Gateway project.*

This document provides rules and guidelines for contributing to the SAIFE Gateway project. Read this to understand how to submit pull requests, run tests, and adhere to the project's strict fail-closed security doctrine.

We welcome contributions to the SAIFE Gateway from educators, developers, and security researchers. Please follow these guidelines to ensure the safety and pedagogical integrity of the project.

## How to Run Tests

Before submitting any Pull Request (PR), you must ensure all tests pass.

```bash
# Install dependencies
npm ci

# Run test suite
npm test
```

## The Fail-Closed Rule for Contributions

> [!CAUTION]
> **No PR may weaken a safety check to make a test pass.**

The SAIFE Gateway is built on a fail-closed doctrine. If a test is failing because a safety constraint is too strict, the correct approach is to discuss the pedagogical and security implications in an issue before altering the constraint. Pull Requests that silently bypass or weaken security validations, regex patterns, or compliance checks will be rejected.

## Doc Header Conventions

All markdown documents in this repository must start with a standardized badge row containing the following metadata:

```markdown
# Document Title

![Audience](https://img.shields.io/badge/audience-[audience]-blue)
![Status](https://img.shields.io/badge/status-[status]-orange)
![Updated](https://img.shields.io/badge/updated-YYYY--MM--DD-lightgrey)
*A one-sentence description of what this document covers in italics.*
```

## Verification Conventions

When auditing or automatically verifying interface contract values (such as TTLs, retry counts, or behavioral constants) mentioned in documentation, **search the entire `src/` directory and its test files**. Documentation verifiers must not assume that a value strictly resides in a single file (e.g., `src/types.ts`). A documented value implemented or enforced outside the verifier's assumed file is not a documentation error and should not be reported as a false alarm.

## Naming Clause for Forks

If you fork this repository to create a custom implementation or a divergent project, you must choose a new name that does not include "SAIFE" or "Secure AI for Education" to avoid confusion regarding compliance certifications, expert reviews, and official support. The "SAIFE Gateway" name is reserved for this canonical, audited repository.
