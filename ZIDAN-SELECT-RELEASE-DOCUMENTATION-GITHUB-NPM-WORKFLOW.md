# Zidan Select — Release, Documentation, GitHub and npm Workflow

**Owner:** maintainer / release engineer
**Applies to:** every release of `zidan-select`
**Current target:** 2.6.0
**Authority:** the implementation in `zidan-form.js` and the public declarations in `zidan-form.d.ts` outrank every README claim, demo or issue comment.

This document is the master workflow for release documentation, demos, GitHub publication, npm publication, semantic versioning, release notes, package verification and post-release checks. A release is not complete until every gate below has evidence.

## 1. Non-negotiable rules

1. Never publish untested code, an untested tarball, or a version that differs from the source.
2. Never copy an option, method, event, default or example from README into code or tests. Read the source and prove it.
3. Never invent a feature, default, return type, error, event payload or browser behavior.
4. Never expose secrets, tokens, private URLs or customer data in source, demos, screenshots, logs or release notes.
5. Never bump a version, commit, push, tag, create a GitHub release, publish to npm or change repository settings without explicit approval for that phase.
6. Keep `dist/` out of Git. It is generated; release it through npm only.
7. A red test, a failed lab, a stale generated asset or a missing package file blocks the release.
8. Documentation and demos are part of the product, not post-release cleanup.

## 2. Phase 0 — Baseline and authority

Before planning work:

- Confirm the branch, HEAD and released tag.
- Confirm the npm dist-tag and published version.
- Confirm the GitHub release and Pages deployment.
- Record the working tree, including pre-existing uncommitted changes.
- Identify the source of truth for runtime, types, package exports and build slices.
- Never treat a local demo as proof that the published package is current.

Commands:

    git status --short
    git log --oneline --decorate -10
    git tag --list "v*" --sort=-v:refname | Select-Object -First 5
    npm view zidan-select version dist-tags --json
    gh release list --limit 5

## 3. Phase 1 — Evidence-based audit

Produce and review:

- `quality-reports/RELEASE-FEATURE-INVENTORY.csv`
- `quality-reports/RELEASE-AUDIT.md`
- the current `quality-reports/DEMO-COVERAGE-MATRIX.csv`
- the latest lab reports

The inventory must cover:

- components and initializers;
- options and callbacks;
- methods and statics;
- events;
- HTML data attributes;
- enum values;
- CSS classes and tokens;
- validation groups.

Every row needs a source file and line, public status, test reference, demo coverage, documentation coverage, TypeScript coverage and release status. No unresolved source locations.

The audit must answer:

- Which public features are implemented but undocumented?
- Which are documented but not implemented?
- Which are declared but absent from the runtime?
- Which are runtime-only and missing from declarations?
- Which demos are missing, partial, simulated or dependent on an external service?
- Which GitHub files, workflows or settings are missing?
- Which package contents differ from the published version?
- Which version is justified by the actual changes?

**Exit gate:** the user approves the findings, the version recommendation and the update plan.

## 4. Phase 2 — Approved updates

Only after approval:

### 4.1 Source and types

- Fix runtime/declaration drift first.
- Add a declaration-parity test that scans every option reader, not only `opts.*`.
- Add regression tests for every public behavior change.
- Do not remove a runtime API in a minor release; deprecate with a changelog note and a migration path.
- Remove a never-implemented declaration only with an explicit changelog entry.

### 4.2 Documentation

- Correct stale counts, sizes, version pins and “complete” claims.
- Every public option and callback needs a table row with type, default, supported values and data attribute where one exists.
- Every method and static method needs a signature, parameters, return, errors and a runnable example.
- Every event needs its payload fields, when it fires and whether it is cancelable.
- Document public CSS hooks; mark internal hooks and internal attributes as non-public.
- Generate HTML from Markdown; do not hand-edit generated HTML.
- Documentation examples must run against the public API.

### 4.3 Demos and controls

Every component page uses the A–I contract:

- **A — Overview:** purpose and when to use it.
- **B — Basics:** minimal markup and initialization.
- **C — Options:** real controls for every public option, or a labeled non-visual code example.
- **D — Methods:** executable controls with return and error display.
- **E — Events:** live payload console.
- **F — Validation:** native and custom states, errors and recovery.
- **G — Accessibility:** labels, keyboard, ARIA, focus and screen-reader notes.
- **H — Responsive and theming:** mobile, RTL, themes and framework adapters.
- **I — Code and API:** copyable code tabs and cross-links to the reference.

Rules:

- A control must change the live preview, not only a code string.
- Simulated uploads, external APIs and mocks must be labeled in the UI.
- The event console must listen to all public events and preserve nested payload data safely.
- No incomplete page, dead link, console error or horizontal overflow at 390 px.
- A page is COMPLETE only when preview, code, explanation, interaction, accessibility and responsive checks pass.

### 4.4 Repository and package

- Add `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, a PR template and issue templates.
- Add a fresh-tarball check that requires the changelog, README, license, declarations, ESM entry and docs Markdown.
- Install the packed tarball into a clean directory and test CJS, ESM, select-only, file-only, minified and CSS subpaths.
- Test declarations under both `bundler` and `node16` resolution.
- Do not ship generated HTML or screenshots unless the package policy explicitly says so.

## 5. Phase 3 — Release preparation

1. Freeze the feature set.
2. Choose the version with the decision table below.
3. Move `[Unreleased]` to a dated version section.
4. Regenerate the inventory, demo matrix and generated docs.
5. Bump every version site with the release script:

       npm run release -- 2.6.0 --no-commit

6. Verify the version in:

   - `package.json` and `package-lock.json`;
   - the runtime banner and `VERSION`;
   - CSS banners;
   - `lab-inventory.js`;
   - README CDN pins;
   - demo pages and docs pages;
   - the changelog heading.

7. Run the full gate:

       npm test
       npm run types
       npm run lint
       npm run pack:check
       npm run lab:all

8. Inspect a fresh tarball, not a cached one.
9. Compare the tarball file list, size and declarations with the published baseline; explain every difference.
10. Review the release diff for generated registry changes, secrets and unrelated formatting.

## 6. Phase 4 — GitHub and npm publication

Publication requires a **separate explicit approval** after Phase 3 evidence is attached.

1. Merge the release branch to `main` through a PR.
2. Confirm `main` points at the release commit.
3. Create the annotated tag `vX.Y.Z` on that commit.
4. Create the GitHub release with notes from the changelog section.
5. Publish npm through the trusted-publishing workflow with provenance.
6. Do not publish a tag that disagrees with `package.json`.
7. Do not republish a version that already exists.
8. Do not force-push or move a published tag.

## 7. Phase 5 — Post-release verification

Verify from the outside:

- `npm view zidan-select version dist-tags`
- a clean install of the published version;
- CJS, ESM, select-only, file-only, minified and CSS imports;
- TypeScript resolution for both module modes;
- CDN URLs for the exact version;
- GitHub release assets and notes;
- Pages homepage, docs, lab and sitemap;
- all 16 sitemap URLs return 200;
- no console errors, missing assets or stale version labels;
- the live demo event console shows all 33 events.

Record the evidence in `quality-reports/` and close the release only after every check is green.

## 8. Version decision table

| Change | Version |
| --- | --- |
| Docs, demos, tests only, no public API change | patch |
| Backward-compatible option, method, event or default change | minor |
| Breaking runtime removal or incompatible behavior | major |
| Declaration-only cleanup of a never-implemented feature | minor, with explicit note |
| Security fix without API change | patch |

For 2.6.0 the justification is minor: new `zidan:deselect` and `onDeselect`, canonical `framework`, `virtual: 'auto'` default, warning-only setters and a public documentation/demo expansion. No documented runtime API is removed.

## 9. Release notes standard

Use Keep a Changelog sections:

- Added
- Changed
- Fixed
- Deprecated
- Removed
- Security

Each bullet states the user-visible effect and the migration action, if any. Do not list internal refactors unless they affect consumers. Include the package size only when it changed materially.

## 10. Stop conditions and rollback

Stop the release if:

- any test, type check, lint, pack check or lab fails;
- the tarball lacks a required file;
- the published version or tag already exists;
- a demo depends on an unlabeled external service;
- documentation and source disagree;
- a secret or private URL is found;
- the release commit contains generated registry churn or unrelated files.

Before publication, rollback is a normal revert. After publication, never delete a version; publish a patch with a clear advisory and changelog entry.

## 11. Approval gates

| Gate | Approval needed |
| --- | --- |
| Phase 1 findings and version | yes |
| Phase 2 edits | yes, this approval |
| Phase 3 release candidate | yes |
| Commit and push | separate yes |
| Tag and GitHub release | separate yes |
| npm publish | separate yes |
| Repository settings | separate yes |

## 12. Current 2.6.0 evidence

- Phase 1 audit: `quality-reports/RELEASE-AUDIT.md`
- Phase 3 candidate evidence: `quality-reports/RELEASE-2.6.0-EVIDENCE.md`
- Draft GitHub release notes: `quality-reports/RELEASE-2.6.0-NOTES.md`
- Feature inventory: `quality-reports/RELEASE-FEATURE-INVENTORY.csv`
- Demo matrix: `quality-reports/DEMO-COVERAGE-MATRIX.csv`
- Runtime: `zidan-form.js`
- Types: `zidan-form.d.ts`
- Package manifest: `package.json`
- Changelog: `CHANGELOG.md`

This workflow is a gate, not a suggestion. When evidence and a claim disagree, the evidence wins and the release waits.
