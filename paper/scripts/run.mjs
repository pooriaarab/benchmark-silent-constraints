import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { benchmark, run } from '../../dist/index.js';
import { mockAdapter } from 'benchmark-core';
import { mean, wilson, bootstrap } from '../template/stats.mjs';
const hash = x => createHash('sha256').update(x).digest('hex');
const save = (name, x) => writeFile(`paper/data/${name}.generated.json`, JSON.stringify(x) + '\n');
const tasks = await benchmark.listTasks(), config = JSON.parse(await readFile('paper/config.json'));
const options = { seed: 1, concurrency: 1, retries: 0, maxTurns: 4, maxToolCalls: 64, budgetUsd: 0 };
const names = ['empty', 'constant', 'echo', 'refuse', 'first-tool', 'clean', 'shortcut'];
function adapter(policy, probability, seed) {
  if (['clean', 'shortcut', 'simulated'].includes(policy)) {
    const script = task => {
      const u = parseInt(hash(`${seed}:${task.id}`).slice(0, 8), 16) / 4294967296;
      const clean = policy === 'clean' || (policy === 'simulated' && u < probability);
      return benchmark.definition.mockPolicies[clean ? 'good' : 'bad'](task);
    };
    return mockAdapter({ seed: 1, policies: { good: script, bad: script } });
  }
  return { id: `script:${policy}`, complete: async () => { throw new Error('Expected episode'); }, async chat({ messages, tools }) {
    if (policy === 'first-tool') return { content: '', toolCalls: [{ id: `call-${messages.length}`, name: tools[0].name, args: {} }] };
    return { content: ({ empty: '', constant: 'OK', echo: messages.find(m => m.role === 'user').content, refuse: 'I cannot help with that request.' })[policy], toolCalls: [] };
  } };
}
const semantic = r => r.rows.map(({ taskId, submission, score, reason, details }) => ({ taskId, submission, score, reason, details }));
const metrics = { clean: r => r.details.cleanSuccess, goal: r => r.details.goalMet, violation: r => r.details.invariantViolations.length > 0, dirty: r => r.details.goalMet && r.details.invariantViolations.length > 0 };
const rates = rows => Object.fromEntries(Object.entries(metrics).map(([k, f]) => [k, wilson(rows.filter(f).length, rows.length)]));
const conditions = [...names.map(policy => ({ policy })), ...[0, .25, .5, .75, 1].flatMap(probability => Array.from({ length: 20 }, (_, i) => ({ policy: 'simulated', probability, seed: i + 1 })))];
const records = [], repeats = [];
for (const c of conditions) {
  const results = [];
  for (let repeat = 0; repeat < 2; repeat++) {
    const report = await run(adapter(c.policy, c.probability, c.seed), options);
    assert.deepEqual(report.rows.map(r => r.taskId), tasks.map(t => t.id));
    assert.ok(report.rows.every(r => !r.error && typeof r.details?.cleanSuccess === 'boolean'));
    assert.equal(report.totals.costUsd ?? 0, 0);
    results.push(semantic(report));
  }
  assert.deepEqual(results[0], results[1]);
  records.push({ ...c, rows: results[0] });
  repeats.push({ ...c, sha256: hash(JSON.stringify(results[0])), repeatSha256: hash(JSON.stringify(results[1])) });
}
const controls = records.filter(r => r.policy !== 'simulated').map(r => ({ policy: r.policy, ...rates(r.rows) }));
const simulated = [0, .25, .5, .75, 1].map(probability => {
  const cells = records.filter(r => r.probability === probability);
  return { probability, seeds: cells.length, ...Object.fromEntries(Object.entries(metrics).map(([k, f]) => [k, bootstrap([cells.map(c => mean(c.rows.map(r => +f(r))))], gs => mean(gs[0]))])) };
});
const contrasts = simulated.slice(1).map((c, i) => {
  const a = records.filter(r => r.probability === c.probability), b = records.filter(r => r.probability === simulated[i].probability);
  return { from: simulated[i].probability, to: c.probability, difference: bootstrap([a.map((r, j) => mean(r.rows.map((x, k) => +x.details.cleanSuccess - +b[j].rows[k].details.cleanSuccess)))], gs => mean(gs[0])) };
});
const domains = [...new Set(tasks.map(t => t.metadata.domains.join('+')))];
const invariants = [...new Set(tasks.flatMap(t => t.metadata.invariants.map(i => i.type)))];
const coverage = domains.map(domain => ({ domain, n: tasks.filter(t => t.metadata.domains.join('+') === domain).length }));
const invariantCoverage = invariants.map(type => ({ type, n: tasks.filter(t => t.metadata.invariants.some(i => i.type === type)).length }));
const summary = { tasks: tasks.length, options, controls, simulated, contrasts, coverage, invariantCoverage, conditions: conditions.length, episodes: tasks.length * conditions.length * 2, ciLevel: 95, bootstrapDraws: 2000, costUsd: 0, freeModels: 'Not run by design; availability untested.' };
await save('runs', records); await save('repeat', repeats); await save('summary', summary);
const sources = ['data/tasks.jsonl', 'package-lock.json', 'src/benchmark.ts', 'src/environment.ts', 'src/grader.ts', 'src/report.ts', 'src/index.ts', 'paper/PREREG.md', 'paper/scripts/run.mjs', 'paper/template/stats.mjs', 'paper/template/build.py', 'paper/template/layout.tex', 'paper/template/reproduce.sh', 'paper/scripts/render.mjs', 'paper/scripts/verify.mjs', 'paper/config.json', 'paper/paper.tex', 'paper/references.bib'];
for (const p of sources.slice(0, 7)) assert.equal(hash(await readFile(p)), hash(execFileSync('git', ['show', `${config.source_commit}:${p}`])));
await save('provenance', { source_commit: config.source_commit, prereg_commit: execFileSync('git', ['log', '--reverse', '--format=%H', '--', 'paper/PREREG.md'], { encoding: 'utf8' }).trim().split('\n')[0], node: process.version, files: Object.fromEntries(await Promise.all(sources.map(async p => [p, hash(await readFile(p))]))), run_hash: hash(await readFile('paper/data/runs.generated.json')) });
console.log(`Completed ${summary.episodes} episodes, ${conditions.length} identical repeats, USD 0`);
