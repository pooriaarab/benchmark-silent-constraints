# Silent Constraints provenance

This file is generated from the benchmark definition.

## Seeded silent-constraints task generator

- Kind: `synthetic`
- URL: https://github.com/pooriaarab/benchmark-silent-constraints/blob/main/scripts/gen-tasks.mjs
- Licence: `MIT`
- Retrieved: 2026-10-16T00:00:00.000Z
- How to get it: Run `node scripts/gen-tasks.mjs` from the repository root. Add `--seed N --split hidden` for a hidden split (data/tasks.hidden.jsonl, gitignored).
- Contamination notes: Public tasks generated with seed 20261016 (cutoff). Task metadata carries the scripted clean solution and shortcut used by the mock provider; keep final evaluation on a separately seeded hidden split.
- Refresh: Change the seed, run the generator, and review the JSONL diff.
