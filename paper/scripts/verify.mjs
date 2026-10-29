import assert from 'node:assert/strict';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { benchmark } from '../../dist/index.js';
import { mean, wilson, bootstrap } from '../template/stats.mjs';
const json = async p => JSON.parse(await readFile(p));
const hash = x => createHash('sha256').update(x).digest('hex');
const s = await json('paper/data/summary.generated.json'), runs = await json('paper/data/runs.generated.json'), repeats = await json('paper/data/repeat.generated.json'), provenance = await json('paper/data/provenance.generated.json');
const tasks = await benchmark.listTasks(), metric = { clean: r => +r.details.cleanSuccess, goal: r => +r.details.goalMet, violation: r => +(r.details.invariantViolations.length > 0), dirty: r => +(r.details.goalMet && r.details.invariantViolations.length > 0) };
assert.equal(runs.length, s.conditions); assert.equal(s.episodes, runs.length * tasks.length * 2);
for (const [i, run] of runs.entries()) {
  assert.deepEqual(run.rows.map(r => r.taskId), tasks.map(t => t.id));
  assert.equal(hash(JSON.stringify(run.rows)), repeats[i].sha256); assert.equal(repeats[i].sha256, repeats[i].repeatSha256);
  for (const [j, row] of run.rows.entries()) {
    const scored = await benchmark.score(tasks[j], row.submission, { seed: s.options.seed });
    assert.equal(scored.score, row.score); assert.deepEqual(scored.details, row.details);
  }
}
for (const c of s.controls) for (const [key, f] of Object.entries(metric)) {
  const rows = runs.find(r => r.policy === c.policy).rows;
  assert.deepEqual(c[key], wilson(rows.reduce((n, r) => n + f(r), 0), rows.length));
}
for (const c of s.simulated) for (const [key, f] of Object.entries(metric)) {
  const means = runs.filter(r => r.probability === c.probability).map(r => mean(r.rows.map(f)));
  assert.deepEqual(c[key], bootstrap([means], gs => mean(gs[0])));
}
for (const c of s.contrasts) {
  const a = runs.filter(r => r.probability === c.to), b = runs.filter(r => r.probability === c.from);
  assert.deepEqual(c.difference, bootstrap([a.map((r, j) => mean(r.rows.map((x, k) => metric.clean(x) - metric.clean(b[j].rows[k]))))], gs => mean(gs[0])));
}
for (const [p, digest] of Object.entries(provenance.files)) assert.equal(hash(await readFile(p)), digest);
assert.equal(hash(await readFile('paper/data/runs.generated.json')), provenance.run_hash);
const meta = await json('paper/meta.json'), config = await json('paper/config.json');
assert.equal(meta.title, config.title); assert.equal(meta.license, 'CC-BY-4.0'); assert.ok(meta.abstract.length <= 1920 && /^[\x00-\x7F]*$/.test(meta.abstract));
const pdf = `paper/${meta.artifact_name}`, info = execFileSync('pdfinfo', [pdf], { encoding: 'utf8' });
const pages = Number(info.match(/Pages:\s+(\d+)/)[1]); assert.ok(pages >= 8);
const text = execFileSync('pdftotext', [pdf, '-'], { encoding: 'utf8' });
assert.ok(text.includes('Simulated') && text.includes('References')); assert.ok(!text.includes('—'));
const log = await readFile('paper/paper.log', 'utf8'); assert.ok(!/Overfull|undefined references|undefined citations/.test(log));
assert.equal((await readdir('paper/figures')).filter(f => f.endsWith('.generated.csv')).length, 3);
await writeFile('paper/data/verification.generated.json', JSON.stringify({ pages, conditions: runs.length, episodes: s.episodes, rescoredTraces: runs.reduce((n, r) => n + r.rows.length, 0), repeatHashesAgree: true, summariesRecomputed: true, sourceHashesAgree: true, pdfSha256: hash(await readFile(pdf)) }) + '\n');
console.log(`Verified ${pages} pages, ${runs.length} repeat hashes, ${s.episodes / 2} rescored traces, all rate intervals`);
