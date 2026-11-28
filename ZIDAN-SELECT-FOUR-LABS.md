# Zidan Select — Four-Lab Quality System
**Upgraded agent specification | Repository integration draft**

## 1. Mission and operating model

Build four independently runnable quality labs for the existing **Zidan Select** JavaScript library:

1. **Testing Lab** — verifies actual component behaviour, options, methods, events, HTML/CSS integration, lifecycle, forms, accessibility, security, compatibility and performance.
2. **Demo Lab** — verifies that supported public features are represented by accurate, working demos and examples.
3. **Bug Finder Lab** — detects, reproduces, classifies and tracks defects across source, builds, package output, demos and documentation.
4. **Documentation Lab** — checks that GitHub-facing documentation, npm README, API references, examples, TypeScript declarations and demos agree with the released implementation.

The labs are separate commands, but share a source-grounded feature registry, repository scanner, evidence format and reporting utilities.

**This document is a specification, not evidence that any lab exists or has passed.** Inspect the checked-out repository and run the checks before making claims.

## 2. Non-negotiable safeguards

- Inspect the current branch, commit, package version, repository structure, package scripts, source entry points, build process, tests, demos and documentation before changing anything.
- Treat the checked-out implementation and actual package exports as the primary evidence for released behaviour. Use README, declarations and demos as cross-checks, not as proof by themselves.
- Reuse existing tests, API Lab, demo infrastructure and scripts where suitable. Do not create a duplicate framework without documenting the gap.
- Do not rewrite the library, reorganise the whole repository, rename public APIs or change public behaviour as part of lab construction.
- Never delete, move, overwrite or regenerate existing files until references, package inclusion and purpose have been checked. Obtain approval for destructive changes.
- Audit commands are read-only with respect to production source by default. Findings and proposed patches are separate workflows.
- Never mark a test as passed unless it was executed and its assertion passed. Use `NOT RUN`, `BLOCKED`, `UNSUPPORTED`, `INCONCLUSIVE` or `FLAKY` when appropriate.
- Do not infer support from a name, comment, type declaration or documentation entry alone.
- Do not invent APIs, defaults, accepted values, browser support, framework support, test evidence or performance thresholds.
- Never silently convert a suspected static-analysis warning into a confirmed bug.
- No live-store/site changes, deploy, Git push, release or npm publish without explicit user approval.
- Keep credentials, tokens, `.env` values, customer data and private keys out of reports and fixtures. Redact secrets in logs.
- Preserve public API and backward compatibility unless a breaking change is explicitly approved.
- Avoid installing dependencies or changing lockfiles until the need, compatibility and impact are explained.

## 3. Stage zero — repository discovery and baseline

Before implementation, produce a baseline report containing:

- Branch, commit hash, working-tree status and package version.
- `package.json`: name, version, scripts, `main`, `module`, `types`, `exports`, `files`, dependencies and devDependencies.
- Source entry points, build scripts, generated artifacts and public exports.
- Actual component, option, method, event and callback inventory.
- Actual defaults, accepted values, types, validation rules and component applicability where discoverable.
- HTML requirements: elements, attributes, IDs/classes, form behaviour and initialization rules.
- CSS entry points, themes, layouts, states, breakpoints and required assets.
- Demo pages and their HTML/JS/CSS dependencies, including navigation and GitHub Pages configuration.
- Existing unit, integration, browser, accessibility and API Lab tests.
- Documentation locations and npm package inclusion rules.
- Existing bug reports and their current status.
- Current build output and compressed sizes if a safe build command exists.
- Exact commands run, exit codes, environment and any blocked steps.

Do not make a large refactor before the baseline is reviewed. A clean Git status is preferred; if the tree is dirty, record it and do not overwrite the user's changes.

## 4. Shared source-of-truth feature registry

Suggested location: `quality-labs/shared/feature-registry/`.

Create a machine-readable inventory from the real repository, not from assumptions. Possible files:

- `components.json`
- `options.json`
- `methods.json`
- `events.json`
- `html-requirements.json`
- `css-features.json`
- `demos.json`
- `documentation.json`
- `compatibility.json`

Each applicable record should include:

- Stable feature ID and component.
- Public name, kind (component/option/method/event/state/style/etc.).
- Source file and symbol/line reference.
- Actual default, accepted values, type and validation behaviour, when verifiable.
- Applicable component(s) and dependencies/constraints.
- Related HTML requirements and CSS/theme dependencies.
- Test IDs, demo page/case IDs and documentation page/heading.
- Support status: `verified`, `unverified`, `unsupported`, `deprecated` or `planned`.
- Evidence and the method used to verify it.

Registry rules:
- Keep source-derived facts distinct from documentation claims.
- Record ambiguity and conflicting sources instead of silently choosing one.
- Mark a feature `verified` only after implementation and observable behaviour have been checked.
- Do not include internal/private implementation details as public API.
- Do not assume every internal option is supported by every component.
- Use stable IDs so reports can be compared between versions.

The registry is a coverage map, not a replacement for source code.

## 5. Shared report contract

Each lab produces Markdown and JSON reports under:

`quality-labs/reports/<lab-name>/<run-id>/`

Every report records:

- Lab name/version and report schema version.
- Repository package version, branch, commit and working-tree state.
- Date/time, OS, runtime versions and relevant browser versions.
- Commands executed and exit codes.
- Counts: passed, failed, skipped, blocked, unsupported, inconclusive, flaky and not run.
- Findings with stable IDs, severity/confidence where relevant.
- Evidence: test output, stack trace, screenshot, browser trace, file/line/symbol or package inspection.
- Coverage denominator and numerator, with exclusions explained.
- Limitations and unverified areas.

Do not overwrite historical reports. Do not include generated reports in the npm package unless intentionally required. Reports must not contain secrets.

## 6. Lab 1 — Testing Lab

**Goal:** demonstrate whether the actual supported public API works.

### 6.1 Core coverage

For every supported component and applicable public feature, test:

1. **Construction and initialization:** valid setup, missing required inputs, invalid configuration, default configuration and repeated initialization behaviour.
2. **Options:** default, valid values, invalid values, type mismatch, boundary values, empty values and interactions with related options.
3. **Methods:** correct invocation, arguments, return values, side effects, invalid state and behaviour after destroy.
4. **Events/callbacks:** event name, payload shape, timing/order, correct target, expected count and absence of duplicate delivery.
5. **State synchronisation:** internal state, DOM attributes/properties, displayed value, selected data and native form value remain consistent.
6. **HTML integration:** required element types, labels, IDs/classes, attributes, disabled/required/readonly states, form ownership and native submission.
7. **CSS/UI:** required CSS, themes, layouts, focus/hover/disabled/error/loading/empty states, responsive behaviour and style isolation.
8. **Data handling:** empty, null, undefined, malformed, duplicate, long, Unicode, special-character and large datasets as applicable.
9. **Lifecycle:** initialize, update/reconfigure, open/close, mount/unmount, destroy and reinitialize; verify cleanup and no stale state.
10. **Asynchronous behaviour:** loading, success, empty response, malformed response, rejection, timeout, cancellation, rapid query changes and stale/out-of-order responses where supported.
11. **Accessibility:** keyboard-only operation, focus order/visibility, labels, accessible names, roles, ARIA state, announcements and automated accessibility checks.
12. **Security:** safe rendering of untrusted labels/content, injection resistance, unsafe URL handling and file validation where relevant.
13. **Compatibility:** only the browsers, runtimes and frameworks explicitly claimed by the project.
14. **Performance:** initialization, rendering, filtering/search, interaction latency, memory/cleanup and package size with reproducible environment and dataset notes.
15. **Packaging:** verify actual built files, ESM/classic entry points, CSS files, declarations and exports resolve from a packed package.

### 6.2 Option and combination strategy

- Test each public option individually against its documented default and accepted values.
- Test meaningful combinations using constraints from implementation and the registry.
- Use pairwise coverage for larger option sets; exhaustive combinations only when the state space is small.
- Include boundary and invalid combinations where the API defines expected handling.
- Do not treat impossible or explicitly unsupported combinations as failures; mark them `UNSUPPORTED` with the reason.
- Include regression tests for every confirmed bug after an approved fix.

### 6.3 Component-specific test ideas — only when the registry confirms support

These are test prompts, not claims that every capability exists:

| Component family | Example checks if supported |
|---|---|
| Select / dropdown | open/close, selection, clear, search/filter accuracy, keyboard navigation, empty state, disabled options, remote results, pagination, stale requests |
| Multi-select | multiple selection, duplicate prevention, max-selection limit, chip removal, clear-all, value serialization |
| File upload | single/multiple selection, drag/drop, allowed extensions and MIME checks, size limits, invalid files, preview lifecycle, removal, upload progress/error/cancel |
| Checkbox | checked/unchecked, group state, indeterminate state, required validation, label activation |
| Radio | mutual exclusivity, group names, selected value, keyboard navigation, exactly-once change events |
| Switch | checked state, keyboard operation, disabled state, accessible name, controlled/uncontrolled state if applicable |
| Date picker | parsing/formatting, invalid dates, leap years, min/max bounds, locale/time-zone handling if supported |
| Time picker | 12/24-hour formats, bounds, invalid values, keyboard input |
| Phone input | country code handling, formatting, pasted values, invalid input and normalization |
| Range slider | min/max/step, single/dual thumb if supported, keyboard operation, value display |
| Number input | decimals, negatives, min/max, step, precision and invalid text |
| Text input | required/pattern/length validation, input/change/blur events, Unicode, paste and special characters |

Never add tests for a feature just because it appears in this table. First verify that the current release supports it.

### 6.4 Form and browser integration

Where relevant, test:
- Submit with valid and invalid values.
- Native `required`, disabled and readonly semantics.
- Form reset and whether UI state returns to the correct value.
- Programmatic value changes and synchronization.
- Labels, focus, tab order and keyboard interaction.
- Multiple instances on one page, including identical option sets and independent state.
- Dynamic insertion/removal of controls.
- Mobile viewport and touch interaction.
- CSS collisions with ordinary page styles and multiple themes on one page, if claimed.

### 6.5 Security and robustness

- Test user-controlled labels, option text, filenames and messages using harmless XSS payload strings; verify they are rendered as text or safely sanitized, never executed.
- Check URL protocols before creating clickable links from user-controlled values.
- Validate file extension, declared MIME type and size consistently; do not claim client-side checks replace server-side validation.
- Test malformed configuration and hostile-looking strings without exposing secrets or executing payloads.
- Run dependency vulnerability checks only with a known tool and record advisory/database date; distinguish direct dependency risk from transitive findings.
- Do not test destructive payloads against live systems.

### 6.6 Performance and scale

Use representative small, medium and large datasets appropriate to the component (for example 100, 1,000 and 10,000 records only if meaningful). Record:
- Hardware/OS/runtime/browser.
- Dataset shape and size.
- Warm-up and iteration count.
- Median and percentile where reliable.
- Memory measurement method and limitations.
- Bundle file and compressed sizes.

Establish measured baselines before introducing pass/fail thresholds. Do not invent universal millisecond limits or compare unlike environments.

### 6.7 Test quality rules and outputs

- Deterministic fixtures, isolated tests and reliable setup/teardown.
- Assert observable outcomes, not merely no exception.
- Check event counts and DOM/state before and after lifecycle operations.
- Use real browsers for browser behaviour; jsdom is not proof of browser compatibility.
- Separate product failures from flaky tests and environment/tooling failures.
- Report coverage by component, option, method, event, state, browser and combination.
- List untested, unsupported and blocked cases explicitly.

Suggested tools to evaluate (not install automatically): existing runner, Vitest/Jest, Playwright, axe-core, ESLint, TypeScript compiler and `npm pack --dry-run`. Choose the smallest compatible stack.

## 7. Lab 2 — Demo Lab

**Goal:** prove public examples are complete, accurate and interactive.

### Required checks

- Every supported public component has an appropriate demo or a documented reason why not.
- Every public option is represented individually or in a clearly labelled meaningful combination.
- Important supported combinations, methods and events have examples where appropriate.
- HTML elements, IDs, classes, attributes, labels and form structure match actual requirements.
- Initialization uses real public APIs, valid defaults and correct import paths.
- Demo controls actually change the component and display the resulting state.
- Event/callback output is observable and accurately described.
- Loading, empty, error and disabled states are demonstrated where supported.
- Required JS, CSS, fonts and assets load without missing requests.
- No console errors, unhandled promise rejections or unexpected network failures.
- Keyboard interaction, responsive layout and mobile/tablet/desktop presentation are checked.
- Copyable examples are complete and do not depend on undocumented internal APIs.
- Demo navigation, links, anchors and GitHub Pages paths work.

### Browser verification

Open every in-scope demo using browser automation where available. Interact with controls, capture console and network failures, inspect responsive layouts, and save screenshots/traces for failures. Static inspection alone must be reported as `STATIC REVIEW ONLY`, not a passing browser test.

### Demo coverage matrix

For every registry feature, report:
- Source support and verification evidence.
- Demo page/case presence.
- HTML, JS and CSS example presence.
- Option/default/combination shown.
- Interaction status: pass/fail/not run/blocked.
- Console/network status.
- Responsive and keyboard status.
- Documentation link.

Missing demo coverage is a demo/documentation gap, not automatically a runtime bug.

## 8. Lab 3 — Bug Finder Lab

**Goal:** find and manage defects across source, APIs, HTML, CSS, builds, package output, tests, demos and docs.

### Detection areas

- Static source analysis, lint and type checks.
- Invalid defaults, option validation and state transitions.
- Incorrect/missing exports, package entry points and generated files.
- Duplicate listeners/events and lifecycle/memory leaks.
- DOM/state/value mismatches and form integration.
- Async race conditions, stale errors and unhandled rejections.
- Rendering, filtering, selection and data edge cases.
- CSS regressions, theme conflicts and responsive defects.
- Accessibility and keyboard regressions.
- Security weaknesses in rendering, URLs and file handling.
- Browser/runtime errors within claimed support.
- Demo failures and broken assets.
- Type declaration, implementation, documentation and package mismatch.
- Dependency and package-content issues.

### Bug record schema

Each finding includes:
- Stable ID, e.g. `ZS-BUG-0001`.
- Title, component and affected feature.
- Category and severity (`critical`, `high`, `medium`, `low`).
- Confidence (`confirmed`, `probable`, `suspected`).
- Status (`new`, `triaged`, `confirmed`, `in-progress`, `fixed`, `regression-tested`, `deferred`, `duplicate`, `not-a-bug`, `needs-reproduction`).
- Affected package version, branch and commit.
- Exact file/line/symbol.
- Preconditions and minimal reproduction steps.
- Expected and actual results.
- Evidence (failing test, log, screenshot, trace).
- Root cause only when established.
- Suggested fix and regression test ID.
- Fix version/commit, if verified.

### Bug handling rules

- Search existing records for duplicates and preserve stable IDs/history.
- Static warnings are hypotheses; reproduce before marking confirmed whenever practical.
- Separate bugs from feature requests, documentation gaps, unsupported configurations and environment failures.
- Never silently delete or rewrite historical findings.
- Do not mark fixed because code changed; require passing regression evidence.
- If not reproducible, retain the record as `needs-reproduction` or `inconclusive`.
- Audit-only mode never patches production code.

### Outputs

New findings, status changes, reproduction instructions, severity/confidence summaries, root causes where known, regression coverage gaps and historical bug inventory.

## 9. Lab 4 — Documentation Lab

**Goal:** make all public documentation accurate, complete and consistent with the actual package.

### Sources to inspect

- Root README and any canonical docs source.
- npm README and package inclusion rules.
- `docs/`, API references, examples and demo explanations.
- TypeScript declarations.
- `package.json` metadata and exports.
- Changelog/release notes.
- GitHub Pages/Wiki content if used.
- Framework integration guides, clearly distinguishing guides from native framework packages.

### Per-feature verification

For each public component, option, method, event and callback:
- Exists in implementation and public export.
- Correct spelling, casing and component applicability.
- Accurate default, type, accepted values, validation and interactions.
- Correct event name, payload, timing and return value.
- TypeScript declaration matches runtime behaviour.
- Import path and package export resolve.
- HTML markup, initialization and CSS requirements are accurate.
- Example is executable or explicitly labelled illustrative/not tested.
- Browser/framework claims are supported by actual test evidence.
- Status is correctly labelled stable, deprecated, planned or unsupported.

### Cross-document checks

- GitHub README versus npm README drift.
- Package name, version, install commands and import paths.
- Broken internal/external links, anchors and image references.
- Missing/duplicate headings and contradictory instructions.
- Outdated screenshots, code snippets and feature lists.
- Examples using removed, private or nonexistent APIs.
- Feature gaps: public option exists but no explanation/demo.
- Docs claiming a feature that source does not implement.
- Framework guide claims that overstate native compatibility.
- Changelog entries and release version consistency.

### Single-source strategy

Inspect current conventions and select a canonical source. Generate or synchronise npm README from it only if practical and safe. Preserve useful sections, anchors, links and badges. Do not blindly replace a README with a shorter file merely to make two copies identical.

### Documentation outputs

API/documentation coverage matrix, incorrect or missing details, GitHub/npm drift, broken links, stale examples, framework claim mismatches and a proposed change list. Run documentation checks and `npm pack --dry-run` where safe. Never publish or push automatically.

## 10. Cross-lab quality gates

These are shared gates, not a fifth mandatory lab:

1. **Browser matrix:** test only claimed browsers and versions. Include desktop/mobile viewport classes where the project claims responsive/mobile support. Record actual browser versions.
2. **Accessibility:** keyboard and automated checks for each component family; manual review remains necessary for meaningful screen-reader behaviour.
3. **Security:** safe rendering, URL handling, file validation, dependency review and secret scanning where tools are available.
4. **Packaging:** test the packed npm artifact, not only the working tree. Verify package files, exports, CSS, ESM/classic entry points and declarations.
5. **Framework integrations:** test React, Next.js, Vue, Svelte, Angular or other frameworks only if the project explicitly documents or supports that integration. A guide is not proof of a native adapter/package.
6. **CMS integrations:** test WordPress/WooCommerce only if they are claimed integration targets. Do not add them as mandatory compatibility targets otherwise.
7. **Regression:** every confirmed fixed defect should have a repeatable regression test where feasible.

## 11. Coverage and release-readiness rules

Do not use a single generic “100% tested” badge. Report separate denominators:
- Public API inventory coverage.
- Option/default/value coverage.
- Meaningful combination coverage.
- Component behaviour coverage.
- Browser coverage.
- Demo coverage.
- Documentation coverage.
- Accessibility/security/performance checks.

A feature counts as covered only when the relevant check was executed and evidence exists. `NOT RUN`, `BLOCKED`, `UNSUPPORTED` and `INCONCLUSIVE` are not passes. Explain exclusions and gaps. High coverage does not prove the library is bug-free.

Recommended priority:
- **P0:** public API, core component behaviour, defaults, values, events, state, lifecycle, package exports and regression.
- **P1:** HTML/CSS integration, forms, keyboard/accessibility, security, demos and docs accuracy.
- **P2:** large-data performance, extended browser matrix, optional framework/CMS integrations and visual polish.

## 12. Commands and independence

After inspecting existing scripts, add separate commands if names do not conflict:

- `npm run lab:test`
- `npm run lab:demo`
- `npm run lab:bugs`
- `npm run lab:docs`
- `npm run lab:all`

These are proposed names, not existing commands. Each lab must run independently. `lab:all` orchestrates them and reports partial failures; it must not hide or convert a failing lab into success. Support a documented read-only audit mode.

## 13. Recommended implementation sequence

1. Baseline discovery and source-grounded registry.
2. Testing Lab using existing test infrastructure.
3. Demo Lab using existing demo pages and browser automation.
4. Bug Finder using evidence from the first two labs and static analysis.
5. Documentation Lab using the shared registry and actual source.
6. Cross-lab gates, combined report and optional CI integration.

Build incrementally. At each stage, show changed files, commands, results, limitations and next proposed step. Ask before destructive changes or production-code patches.

## 14. Definition of done

The system is complete only when:
- Four labs have separate documented commands and run independently.
- The registry reflects actual public APIs and records uncertainty.
- Every report records package version, commit, environment, commands and evidence.
- Supported public features have traceable test/demo/documentation coverage or an explicit gap.
- Tests distinguish pass/fail/blocked/not-run/unsupported/flaky.
- A sample run demonstrates honest passing and failing cases.
- Audit-only commands do not alter production source.
- Existing APIs, builds, demos and documentation remain compatible.
- No destructive changes, push, deployment or publishing occurred without approval.
