# Contributing to SAIFE Gateway

We welcome contributions to the SAIFE Gateway from educators, developers, and security researchers. Please follow these guidelines to ensure the safety and pedagogical integrity of the project.

## How to Run Tests

Before submitting any Pull Request, you must ensure all tests pass.

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

All markdown documents in this repository must start with a standardized header block containing the following metadata:

```markdown
# Document Title

**Purpose:** A one-sentence description of what this document covers.
**Audience:** Who should read this (e.g., Developer, DPO, School Admin).
**Status:** The current state of the document (e.g., Draft, Alpha, Final).
**Last Updated:** Month DD, YYYY
```

## Naming Clause for Forks

If you fork this repository to create a custom implementation or a divergent project, you must choose a new name that does not include "SAIFE" or "Secure AI for Education" to avoid confusion regarding compliance certifications, expert reviews, and official support. The "SAIFE Gateway" name is reserved for this canonical, audited repository.
