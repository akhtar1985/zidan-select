---
name: zidan-demo-lab
description: Verify Zidan Select demos and examples against actual public APIs, including HTML, JavaScript, CSS, browser interactions, responsive layouts and console/network errors.
---

# Zidan Select Demo Lab

## Objective
Ensure demos teach the real supported API and work in a browser. Follow `ZIDAN-SELECT-FOUR-LABS.md`.

## Workflow
1. Record branch, commit, package version and working-tree status.
2. Inspect existing demos, API Lab, docs navigation, build assets and GitHub Pages configuration.
3. Use the shared source-grounded feature registry; never invent features from demo labels.
4. Map each supported component, option, method and event to a demo page/case and explanatory text.
5. Check HTML elements, IDs, attributes, labels, forms and initialization against implementation requirements.
6. Check imports, public API usage, CSS, theme/layout dependencies and asset paths.
7. Verify every demo control changes the intended component and shows the correct state/output.
8. Verify meaningful option combinations and loading/empty/error/disabled states where supported.
9. Open pages in a real browser where possible; inspect console, promise rejections, network requests and missing assets.
10. Check keyboard operation and responsive viewport classes. Capture screenshots/traces for failures.
11. Produce a feature coverage matrix and Markdown/JSON reports.

## Required matrix fields
For each feature: source support status, demo URL/file, HTML/JS/CSS presence, option/default shown, event/method example, interaction status, console/network status, keyboard/responsive status, documentation link and evidence.

## Rules
- Static source inspection is `STATIC REVIEW ONLY`; it is not a browser pass.
- Do not claim a demo works unless it was opened and interacted with.
- A missing demo is a coverage gap, not automatically a runtime bug.
- Do not use private APIs in public examples unless explicitly labelled internal.
- Do not overwrite, rename or delete existing demos until references and navigation are checked and approval is obtained.
- Keep public URLs and anchors working.
- Mark unsupported features as `UNSUPPORTED`, not failed.

## Deliverables
Working/broken demo list, missing examples, HTML/JS/CSS discrepancies, console/network failures, screenshots/traces and feature coverage report. Include exact commands, environment, commit and version.
