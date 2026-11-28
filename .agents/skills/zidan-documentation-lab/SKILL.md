---
name: zidan-documentation-lab
description: Verify Zidan Select documentation against actual implementation, public exports, TypeScript declarations, npm packaging, examples, demos and release metadata.
---

# Zidan Select Documentation Lab

## Objective
Keep GitHub-facing docs, npm README, API references and examples accurate to the released package. Follow `ZIDAN-SELECT-FOUR-LABS.md`.

## Workflow
1. Record branch, commit, package version and working-tree status.
2. Inspect root README, npm README, docs, demos, examples, declarations, package metadata/exports, changelog and GitHub Pages setup.
3. Derive the public API inventory from implementation and public exports; use declarations/docs as cross-checks.
4. Verify every public component, option, default, accepted value, method, event, callback, payload, return value and error behaviour.
5. Verify import paths, package exports, CSS requirements, HTML structure and initialization examples.
6. Compare runtime behaviour with TypeScript declarations.
7. Verify compatibility/framework claims only against actual support and executed tests. A guide is not proof of a native framework adapter.
8. Check GitHub/npm README drift, links, anchors, screenshots, package/version/install commands and examples.
9. Identify missing, incorrect, stale, unsupported and planned content separately.
10. Select a canonical source only after inspecting current conventions. Preserve useful content and links; do not blindly overwrite.
11. Run link/API/example/package-content checks where safe. `npm pack --dry-run` is allowed if it does not publish.
12. Produce Markdown and JSON coverage reports plus a proposed file-change list.

## Per-feature checklist
- Exists in implementation and public export.
- Correct spelling/casing and component applicability.
- Accurate default, type, accepted values, constraints and interactions.
- Correct event name/payload/timing and method return.
- Type declaration matches runtime.
- Correct import path and package export.
- HTML/JS/CSS usage is accurate.
- Example is executed or explicitly labelled untested/illustrative.
- Compatibility and framework claims are evidence-based.
- Stable/deprecated/planned status is clear.

## Rules
- Never invent behaviour or defaults.
- Never document planned work as released.
- Never shorten/replace complete docs merely to force README copies to match.
- Do not remove old docs or break URLs without approval and migration plan.
- Do not claim examples were tested unless executed.
- Do not push, deploy or publish.

## Deliverables
API coverage matrix, missing/incorrect details, GitHub/npm drift, broken links, stale examples, type/runtime mismatches, framework claim issues, proposed edits and verification evidence.
