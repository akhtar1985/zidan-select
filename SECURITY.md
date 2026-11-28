# Security policy

## Supported versions

Security fixes are provided for the current minor release line. At the time of writing that is **2.6.x**. Older minors may receive a fix when the issue is severe and the patch is low risk, but they are not guaranteed.

## Reporting a vulnerability

Please do **not** open a public issue for a suspected vulnerability.

Use GitHub's private vulnerability reporting for this repository:

https://github.com/akhtar1985/zidan-select/security/advisories/new

If private advisories are unavailable to you, contact the maintainer through the GitHub profile at https://github.com/akhtar1985 and ask for a private channel. Do not include exploit details in a public issue.

Please include:

- affected version and build (full, select-only or file-only);
- a minimal reproduction or affected API;
- the impact you believe is possible;
- whether the issue requires a malicious page, a compromised endpoint, or local access;
- any suggested fix or mitigation.

## What to expect

- Acknowledgement as soon as practical.
- Triage and a severity assessment.
- A coordinated fix and release when the report is confirmed.
- Credit in the advisory or release notes if you want it.

## Scope

The library renders DOM and handles user-supplied values, URLs, files and HTML fragments. Reports about DOM injection, unsafe URL handling, cross-site scripting through an option or callback, prototype pollution, denial of service through unbounded input, and unsafe defaults are in scope.

The following are generally out of scope unless they demonstrate a library defect:

- vulnerabilities in a demo's third-party endpoint or hosting provider;
- issues requiring a compromised browser extension or already-compromised machine;
- missing security headers on the documentation site;
- reports that only say "uses innerHTML" without a reachable payload.

## Safe defaults

- Treat callback output, option labels and remote data as untrusted.
- Do not pass secrets to client-side upload or fetch options.
- Keep dependencies at zero; report any accidental runtime dependency as a packaging issue.
