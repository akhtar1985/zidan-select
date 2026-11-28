---
name: zidan-bug-finder-lab
description: Discover, reproduce, classify and track confirmed or suspected Zidan Select defects across source, API, HTML, CSS, builds, package artifacts, demos and documentation.
---

# Zidan Select Bug Finder Lab

## Objective
Produce actionable, evidence-based defect records. Follow `ZIDAN-SELECT-FOUR-LABS.md`.

## Workflow
1. Record branch, commit, package version and environment.
2. Read existing bug inventories and historical reports before allocating IDs.
3. Run safe static checks, existing tests, package checks and relevant browser/demo checks.
4. Scan source, options, methods, events, DOM/state sync, lifecycle, async flows, HTML/CSS, exports, declarations and docs.
5. Reproduce each suspected issue using a minimal test or exact manual steps whenever practical.
6. Search for duplicates; retain stable IDs and historical status.
7. Classify severity, confidence, category and status. Include file/line/symbol and evidence.
8. Recommend a minimal fix and regression test. Do not patch production code in audit mode.
9. After a separately approved fix, rerun reproduction and regression tests before marking regression-tested.
10. Produce Markdown and JSON reports.

## Areas to investigate
Incorrect defaults/validation; duplicate listeners/events; stale async responses; DOM/state/value mismatch; form reset/submit; missing cleanup; unsafe rendering/URLs; file validation; CSS conflicts; accessibility regressions; broken demos/assets; package/build/export errors; TypeScript/runtime mismatch; inaccurate documentation; dependency risks.

Only investigate framework/CMS compatibility if the project explicitly claims it.

## Bug record
Each record must include stable ID, title, component/feature, category, severity, confidence, status, affected version/commit, file/line/symbol, preconditions, reproduction steps, expected/actual result, evidence, root cause if known, suggested fix, regression test ID and fixed commit/version if verified.

Severity: `critical`, `high`, `medium`, `low`.
Confidence: `confirmed`, `probable`, `suspected`.
Status: `new`, `triaged`, `confirmed`, `in-progress`, `fixed`, `regression-tested`, `deferred`, `duplicate`, `not-a-bug`, `needs-reproduction`.

## Rules
- Static warnings are hypotheses, not confirmed bugs.
- Distinguish defects from feature requests, docs gaps, unsupported configurations and environment failures.
- Never fabricate evidence, line numbers or root causes.
- Never silently delete historical findings.
- A code change alone does not prove a bug fixed.
- If not reproducible, retain as needs-reproduction/inconclusive.
- Redact secrets and personal data from all output.

## Deliverables
New/updated bug records, severity/confidence summary, reproduction steps, evidence, root causes where established, proposed fixes and regression coverage gaps. Audit-only by default.
