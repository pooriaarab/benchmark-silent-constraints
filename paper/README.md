# Silent Constraints paper

The packet contains a nine-page paper, three data figures, diagnostic controls, and a labelled simulated population sweep.
The paper reports clean success, goal completion, and invariant violations. It contains no learned-model leaderboard.

From the repository root, with Node 20+, npm, Python 3, Tectonic, and Poppler installed:

```sh
npm ci
sh paper/template/reproduce.sh
```

The output is `paper/silent-constraints-paper.pdf`. PDFs and downloaded styles stay untracked.
The unchanged pilot template downloads the official NeurIPS preprint style and verifies its archive hash.
Tectonic can download dependencies on its first run. Experiment execution uses no network or credentials.
The plan precedes the results in Git history. It is not independently registered.

`data/runs.generated.json` stores actual runner submissions, scores, and grading details.
`data/repeat.generated.json` stores hashes from two executed copies of every condition.
`data/summary.generated.json` contains all counts, rates, intervals, and paired contrasts.
`data/provenance.generated.json` records frozen source hashes and the first plan commit.
`data/verification.generated.json` records full trace rescoring and PDF checks.
The verification script recomputes all reported rates and intervals from the raw traces.

Control intervals use hypothetical task sampling. Simulated intervals bootstrap seeds, not individual episodes.
The simulated endpoint intervals collapse by construction. Neither interval measures deployment risk.
Free hosted inference is omitted by design; current provider availability is untested.
No human survey or independent validation is present. Do not publish or merge automatically.
Paper text and generated figures use CC-BY-4.0. Benchmark code and tasks retain MIT.
The family paper lists this benchmark as 40 synthetic episode tasks at version 0.1.0.
