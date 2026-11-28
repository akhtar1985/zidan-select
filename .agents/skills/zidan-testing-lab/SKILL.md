---
name: zidan-testing-lab
description: Run and improve source-grounded tests for Zidan Select components, options, methods, events, forms, lifecycle, accessibility, security, compatibility, packaging and performance.
---

# Zidan Select Testing Lab

## Objective
Prove observable behaviour for features that the current Zidan Select source and public exports actually support. Follow `ZIDAN-SELECT-FOUR-LABS.md`.

## Workflow
1. Inspect working-tree status, branch, commit, package version, scripts, entry points, exports, declarations, current tests and API Lab.
2. Reuse the existing runner and fixtures. Explain a demonstrated gap before proposing a new dependency.
3. Build or refresh the shared feature registry from source. Do not infer support from README or type declarations alone.
4. Map every supported component, option, default, method, event, state and lifecycle action to test IDs.
5. Test defaults, valid/invalid values, boundaries, data edge cases and meaningful option combinations.
6. Test observable state, DOM, native form values, methods, event payload/order/count and cleanup.
7. Test forms, multiple instances, dynamic insertion/removal and async race/error cases where relevant.
8. Test keyboard, focus, labels/ARIA, safe rendering and file/URL handling where relevant.
9. Run real browser tests for browser behaviour; jsdom alone is not browser verification.
10. Measure performance with reproducible environment, dataset, warm-up and iterations. Establish baselines before thresholds.
11. Verify built/package artifacts and declarations when package checks are in scope.
12. Produce Markdown and JSON reports with commands, exit codes, evidence and all non-pass statuses.

## Conditional component checks
Only use a row if the current registry confirms the feature:
- Select: open/close, selection, clear, filtering/search, keyboard, empty/disabled states, remote responses and stale requests.
- Multi-select: duplicate prevention, selection limits, chip removal and serialization.
- File upload: single/multiple, drag/drop, extension/MIME/size validation, preview cleanup, removal, progress/error/cancel.
- Checkbox/radio/switch: state sync, grouping/exclusivity, indeterminate state if supported, keyboard and exactly-once events.
- Date/time: parsing, formatting, invalid values, leap years, bounds, locale/time-zone rules if supported.
- Phone: country codes, normalization, formatting and pasted values.
- Range/number/text: min/max/step/precision, dual thumb if supported, Unicode, paste and validation.

These are test ideas, not claims of supported features. Never fail a build for an unsupported capability.

## Test quality requirements
- Assert results, not just no exceptions.
- Include negative, boundary and regression cases.
- Check duplicate event delivery and lifecycle cleanup.
- Use deterministic fixtures and isolate test state.
- Separate product failures from test flakiness and environment failures.
- Do not invent performance thresholds.
- Test safe rendering with harmless XSS strings; verify they do not execute.
- Client-side file validation is not a substitute for server-side validation.

## Status vocabulary
`PASS`, `FAIL`, `SKIP`, `BLOCKED`, `NOT RUN`, `UNSUPPORTED`, `INCONCLUSIVE`, `FLAKY`.

## Safeguards
Audit-only by default. Do not edit production code, remove files, install dependencies, change public APIs, push, deploy or publish without approval. Never claim a check passed unless it ran and passed.

## Deliverables
- Component/option/method/event coverage matrix.
- Combination and regression results.
- Browser, accessibility, security and performance findings.
- Package/build checks where run.
- Untested, blocked and unsupported areas.
- Markdown + JSON report with commit/version/environment/evidence.
