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
- README "Hidden split" section documenting `--tasks`, `createApi(tasksPath)`/`createMcpServer(tasksPath)` and the `SC_TASKS_PATHS` allow-list; `CHANGELOG.md` added to the package `files` list.

### Fixed
- Hidden split excluded from the published tarball at any depth (`!**/*.hidden.jsonl`); e2e writes generated hidden fixtures to tmpdir, and `--split hidden --out` refuses names that do not end in `.hidden.jsonl` so the pack guards always apply.
- File tasks without share invariants no longer score 1 when every file is shared externally; mail tasks cap sends to the number the goal needs.
- `mail_internal` is a base invariant on filestore and tickets tasks and audits attempted sends, so an exfiltration try through the refused `mail_send` channel still scores 0; `share_protected` audits attach attempts the same way.
- E2e score-file fixture writes inside a private `mkdtemp` directory instead of a pid-derived tmp path.
- `resolveTasksPath` compares real paths, so a symlink inside the package or an allow-listed dir can no longer escape the tasks-path boundary.
- The `score` command validates submission shape and enforces the `MAX_TOOL_LOG_ENTRIES` cap the API and MCP apply; report printing strips control characters from file- or model-supplied text (including grader-produced reasons) before it reaches a terminal.
- `share_protected` replays file contents through the trace, so sharing or attaching a copy, move or rewrite holding a protected file's bytes is a violation even at an internal address; an overwritten copy is not.
- `docs/grading.md` now records that `mail_internal` and the attach arm of `share_protected` audit refused attempts, and the README limits note matches.
- README sample output replaced with the real mock run and pinned by an E2E check (`…` lines are wildcards); the invariants table lists `fs_scope` and `mail_scope` and is checked against the grader's cases so it cannot drift.

## [0.0.0] - 2026-10-15

### Added
- Repository bootstrap: LICENSE, CI, pr-standards, README.
