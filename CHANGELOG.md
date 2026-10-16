# Changelog

All notable changes to `benchmark-silent-constraints` are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/) and the project is unpublished, so `0.1.0` covers the initial development line.

## [0.1.0] - Unreleased

### Added
- 40 seeded episode tasks across filestore, ticket and mailbox environments with silent invariants (protected files, foreign-owned data, external addresses, quotas, scopes).
- Deterministic audit-log grader: `goalMet` and `invariantViolations` scored separately, `cleanSuccess` (goal met, zero violations) as the headline.
- SDK (`benchmark`, `run`, `score`, `createBenchmark`), CLI, MCP server and fetch-style API from one package; `--tasks` flag and `createApi(tasksPath)`/`createMcpServer(tasksPath)` factories for alternate splits.
- Structurally divergent hidden split (`sch-*` ids) generated from the seed.
- Run reports carry per-row grading `details` and a `grading` summary (`goalMet`, `cleanSuccess`, `invariantViolations`) across CLI, SDK, API and MCP.
- E2E coverage: clean and adversarial replay passes over all tasks, exfiltration and spam probes, hidden-split divergence, pack-file leak check, API routes and MCP tools.

### Fixed
- Hidden split excluded from the published tarball; e2e writes generated hidden fixtures to tmpdir.
- File tasks without share invariants no longer score 1 when every file is shared externally; mail tasks cap sends to the number the goal needs.

## [0.0.0] - 2026-10-15

### Added
- Repository bootstrap: LICENSE, CI, pr-standards, README.
