# Silent Constraints study plan

Registered locally before execution, 2026-10-29. This is a committed plan, not an independent registry deposit. No study results have been collected. We inspected benchmark code and existing tests; those tests already assert clean solutions pass and shortcuts fail. No model leaderboard is planned.

## Question and hypotheses
H1: Packaged clean scripts satisfy goals without violations; packaged shortcuts reduce clean success even when goals succeed. Report goal-only minus clean-success as a paired descriptive contrast, not a discovery test.
H2: Empty, constant, echo, refusal, and first-tool policies do not earn clean success. Report any counterexample without excluding it.
H3 (simulated): Raising the probability of choosing the clean script increases clean success in a simulated agent population. This tests metric response to a programmed mechanism, not learning or a safety intervention.

## Frozen design
Use benchmark-silent-constraints 0.1.0 at 787ac0146117e7e41edc401cd0d999e32a829564, its public tasks, and its public run function with custom adapters or packaged mock scripts. All tasks are episodes. Use seed 1, concurrency 1, no retries, maxTurns 4, maxToolCalls 64, and budgetUsd 0. Stop after the complete fixed grid. Do not call any hosted inference service.
Seven controls: empty output, constant OK, prompt echo, refusal, first available tool with empty arguments, packaged clean solution, packaged shortcut. Run every control twice. Scripts can access answer metadata and are privileged diagnostic controls, not autonomous solvers.
Simulated sweep: clean-script probabilities 0, 0.25, 0.5, 0.75, 1; seeds 1 through 20. For each seed and task, convert the first unsigned 32 bits of SHA256(seed:taskId) to a uniform fraction. Choose clean if fraction is below probability, otherwise shortcut. Reuse draws across probabilities. Execute every simulated choice through the public runner. Repeat the entire sweep and compare semantic traces.

## Outcomes and analysis
Primary: cleanSuccess. Secondary: goalMet, any invariant violation, and goalMet AND any violation. Use 95% Wilson intervals for control proportions over tasks. These are hypothetical task-sampling intervals on a fixed synthetic set, not population representativeness claims.
For the simulated sweep, compute each seed's task mean and bootstrap seeds (2000 draws; fixed bootstrap seed 20261029). Preserve seed pairing across probabilities. Report bootstrap intervals for simulated rates and adjacent clean-success differences. Boundary intervals may collapse by construction. Do not pool all simulated episodes as independent observations.
Report coverage by domain combination and invariant type, control rates, the paired goal-only scoring gap, and simulated sweep curves. No significance tests or multiple-comparison claims. Include all planned nulls.

## Exclusions and evidence
Infrastructure errors halt the run and remain errors; fix causes and rerun the full grid. Empty outputs, refusals, malformed calls, and turn limits remain observations. Exclude no task based on its result. No human raters, surveys, or paid compute. Free hosted inference is omitted by design; current provider availability is untested.
Record raw submissions, scores, details, repeat hashes, frozen source hashes, and plan commit. Verify raw-to-summary agreement and repeatability. Figures and numerical prose derive from generated JSON and CSV. Known failure risks before implementation: lost grading details, false success from final text, contaminated controls, task-order drift, pooled simulation intervals, stale figures, non-deterministic repeat hashes, and silently changed source files.
