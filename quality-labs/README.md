# Zidan Select quality labs

Four independent, audit-only labs for the `zidan-select` repository. They do not replace
`npm test`; they add source-grounded checks that the normal suite does not make: a real
browser walk through the demos, a defect-focused static/regression lab, and a documentation
and packaging audit.

| Lab | Command | Focus |
| --- | --- | --- |
| Testing | `npm run lab:test` | Existing DOM suite, build, types, subset audit, package exports, API inventory, security/event/form checks |
| Demo | `npm run lab:demo` | Real Chrome/Edge runs of demo and guide pages, interactions, accessibility, responsive screenshots, form/lifecycle fixtures |
| Bug Finder | `npm run lab:bugs` | Git whitespace, syntax, duplicate IDs, local references, exports, security sinks, BUGS.md inventory, targeted regressions |
| Documentation | `npm run lab:docs` | Version/release metadata, API coverage, documented names, code fences, links, declarations, npm contents, generated guides |
| All | `npm run lab:all` | Runs the four labs sequentially and reports partial failures honestly |

`npm run lab:all -- --online` forwards `--online` to the Documentation Lab only.

## Requirements and safety

- Node.js 18 or newer. The labs use only existing development dependencies (`jsdom`,
  `esbuild`, `typescript`); no Playwright, axe, server package or network service is needed.
- Demo Lab needs Google Chrome or Microsoft Edge. It finds one automatically; set
  `CHROME_PATH` to override.
- The labs are audit-only by default: they do not edit production source, delete files or
  publish. Testing Lab rebuilds `dist/`; Documentation Lab compiles types, runs
  `npm pack --dry-run` and writes generated guides under `.build/`. Both are ignored build
  outputs.
- Reports go to `quality-labs/reports/<lab>/<run-id>/` and are gitignored. Each run writes
  `report.json`, `report.md` and updates `latest.json`.
- The labs work offline. Network access is attempted only when `--online` is passed to the
  Documentation Lab, and only against the npm registry.

## Layout

```text
quality-labs/
  shared/
    common.mjs        run metadata, commands, report writer, status helpers
    registry.mjs      source-grounded feature registry generator
    server.mjs        dependency-free static HTTP server
    browser.mjs       headless Chrome/Edge CDP driver
    feature-registry/ generated JSON split by feature kind
  test/               Testing Lab (wraps the existing jsdom suite and adds checks)
  demo/               Demo Lab and local browser fixtures
  bugs/               Bug Finder Lab and focused probes
  docs/               Documentation Lab
  all.mjs             cross-lab runner
  reports/            generated, gitignored
```

Rebuild the feature registry after changing public API, HTML requirements, CSS features or
the docs/demo reference set:

```bash
node quality-labs/shared/registry.mjs --write
```

The registry is a coverage map, not proof. Entries start as `unverified`; a lab must execute
an observable check before a feature can be counted as covered. Plain name mentions in tests,
demos or docs are leads, not executed evidence.

## Status semantics

| Status | Meaning |
| --- | --- |
| `PASS` | The check ran and met its stated expectation. |
| `FAIL` | The check ran and the observed behaviour or artifact violated the expectation. |
| `SKIP` | Deliberately not applicable in this run; the reason is recorded. |
| `BLOCKED` | The check could not start because a required prerequisite was missing. |
| `NOT RUN` | The check exists but was not executed in this mode. |
| `UNSUPPORTED` | The repository does not claim this capability, so it is not required here. |
| `INCONCLUSIVE` | The check ran but the evidence cannot support a pass or fail verdict. |
| `FLAKY` | Repeated execution produced inconsistent results; the run is not a pass. |

Only `PASS` is a pass. `INCONCLUSIVE`, `NOT RUN`, `BLOCKED`, `UNSUPPORTED` and `FLAKY` must
not be presented as coverage.

## Report contract

Every `report.json` records package name/version, commit, branch, dirty state, environment
(Node, npm, OS, CPU count), exact commands, duration, checks with status and evidence, coverage
denominators, findings and limitations. `report.md` is a human-readable rendering of the same
data. Labs never rewrite a failed command into a pass.

## Current baseline and known findings

Baseline after the report follow-up fixes (see the latest report for the exact run):

- Testing Lab: **PASS**, 108 checks. New regressions cover BUG-031 (opening on the selected
  value) and BUG-032 (`zidanField()` returning the existing instance).
- Demo Lab: **PASS**, 34 pass / 0 fail / 0 inconclusive. `ZS-DEMO-SELECT-KEYBOARD` now keeps
  React selected, `ZS-DEMO-A11Y-NAMES` finds the CMS tags named, and `ZS-DEMO-MOBILE-TYPE`
  measures 16px at 390px.
- Bug Finder Lab: **PASS**, 9 pass / 0 fail / 2 inconclusive.
  - Security sinks are enumerated but not exploited; they remain `INCONCLUSIVE` for human
    review. The BUGS.md regression gap is also `INCONCLUSIVE` because unnamed tests may still
    cover the behaviour. Neither is a failure.
- Documentation Lab: **PASS**, 10 pass / 0 fail / 1 not run. The README version pin and the
  three broken anchors are fixed; `ZS-DOCS-ONLINE` remains `NOT RUN` unless `--online` is
  passed, so it is reported as not run rather than passed.
- All Labs: **PASS**, with the same residual limits.

These are findings, not lab failures to hide. The fixed findings are tracked in
[`BUGS.md`](../BUGS.md), and each production fix re-ran the labs against the fixed tree.

## Interpretation limits

- Static scans cannot prove the absence of defects, and the security scan does not execute an
  exploit or prove sanitisation.
- Documentation coverage is textual: a name appearing in a guide does not prove its prose is
  correct. Demo Lab is the executable evidence for examples.
- The registry and static checks cover the repository tree, not every browser, framework, CMS
  or assistive technology.
- Browser coverage is the installed Chrome/Edge channel only. No Firefox, Safari or mobile
  device farm is included.
- No performance benchmark, fuzzing, mutation testing or long-running soak test is included.

## Adding a check

Add the check to the relevant `run.mjs`, give it a stable `ZS-<LAB>-...` ID, return only the
statuses above, and include enough evidence to reproduce the result. Do not claim a check ran
when it was skipped, and do not use a name mention as execution evidence. Shared code belongs
in `shared/`; lab-specific fixtures belong under the lab's directory.
