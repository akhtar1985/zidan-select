# Contributing to Zidan Select

Thanks for helping improve Zidan Select. This repository ships the runtime, TypeScript declarations, demos, documentation and release tooling together; a change is only complete when the relevant tests and docs agree.

## Before you start

- Read [README.md](README.md) and [docs/options.md](docs/options.md).
- Search existing issues and pull requests before opening a new one.
- For security problems, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
- By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

```bash
git clone https://github.com/akhtar1985/zidan-select.git
cd zidan-select
npm install
npm run build
npm test
```

The runtime is zero-dependency. `npm install` is only for the repository tooling.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run build` | Build the full, select-only and file-only bundles into `dist/`. |
| `npm test` | Build and run the DOM tests, including subset and declaration checks. |
| `npm run types` | Type-check both declaration configurations. |
| `npm run lint` | Syntax-check every first-party JS/MJS file. |
| `npm run pack:check` | Validate the package manifest and import surfaces. |
| `npm run lab:test` | Run the Testing Lab. |
| `npm run lab:demo` | Run the Demo Lab. |
| `npm run lab:bugs` | Run the Bug Finder Lab. |
| `npm run lab:docs` | Run the Documentation Lab. |
| `npm run lab:all` | Run all four labs. |

Do not commit `dist/`; it is generated. Edit the source slices in `zidan-form.js`, then run the build.

## Pull requests

1. Keep the change focused. Separate unrelated refactors from behavior changes.
2. Add or update tests for every public behavior change. A new option, method or event needs a declaration, documentation, demo coverage and a test.
3. Update the relevant Markdown in `docs/` and the README when the public surface changes. Generated HTML is built from Markdown.
4. Run `npm test`, `npm run types`, `npm run lint`, `npm run pack:check` and the relevant labs before opening the PR.
5. Use the PR template and describe the user-visible change, the tests run, and any release-note text.
6. Do not include secrets, tokens, private URLs or customer data in code, fixtures, screenshots or logs.
7. Do not bump versions, tag, publish or deploy from a feature PR. Release steps are maintainer-only.

## Commit messages

Use short imperative subjects, for example:

```text
Add deselectable radio groups
Fix event console object payloads
Document the complete option type index
```

Reference an issue number when one exists. Keep generated files and unrelated formatting out of the same commit.

## Documentation and demos

- Documentation must describe the runtime, not an intended future behavior.
- Examples must be runnable against the current public API.
- Demos must label simulated uploads, external services and mocks.
- Accessibility and responsive behavior are part of the change, not a follow-up.

## Release policy

Releases are prepared by maintainers. No contributor should commit a version bump, push a tag, create a GitHub release or run `npm publish` without explicit maintainer approval. See [docs/build.md](docs/build.md#releasing) for the release process.
