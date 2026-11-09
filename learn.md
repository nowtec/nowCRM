### 2026-11-09 · The lockfile decides, not the declaration

The critical Next advisory (unauthenticated remote code execution, vulnerable
`>=16.0.0 <=16.4.0`, fixed in `16.4.1`) hit this repository at the resolved
version `16.1.1`. The declaration in `package.json` did not show it: across the
workspace the same `^16.2.10` resolved to `16.4.3` in one repository (not
affected) and to `16.2.9` in another (affected), and one repository declared
`^16.2.9` while shipping `15.5.18`, because its lockfile predated the
declaration. **Exposure is measured on the resolved version in
`pnpm-lock.yaml`, never on the declaration.**

Second point, if the chain `gaxios -> rimraf -> glob -> minimatch` was reported
here too: a `glob` override does not close it cleanly, because `rimraf@5`
requires `glob@^10`. The override belongs one level up: `rimraf: ^6.1.4`
requires `glob@^14.0.3` and brings `minimatch@11` along by itself. **Put the
override on the package that asks for the fixed version of its dependency, not
on the dependency.**
