#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { bootstrapCI, createCli, mockAdapter, openaiCompatAdapter, openrouterAdapter, renderMarkdown, type ModelAdapter, type RunOptions } from "benchmark-core";
import { createBenchmark } from "./benchmark.js";
import { mcpFor } from "./mcp.js";
import { gradingSummary, runWithDetails, type DetailedReport, type DetailedRow } from "./report.js";

const argv = process.argv.slice(2);
const i = argv.indexOf("--tasks");
let tasksPath: string | undefined;
if (i >= 0) {
  tasksPath = argv[i + 1];
  if (!tasksPath || tasksPath.startsWith("--")) {
    console.error("--tasks needs a path to a tasks JSONL file.");
    process.exitCode = 1;
  } else {
    argv.splice(i, 2);
  }
}

const bench = createBenchmark(tasksPath);
const printReport = (report: DetailedReport, json: boolean) => {
  if (json) { console.log(JSON.stringify(report)); return; }
  process.stdout.write(renderMarkdown(report));
  console.log(`grading: ${report.grading.cleanSuccess} clean, ${report.grading.goalMet} goal met, ${report.grading.invariantViolations} invariant violation(s)`);
};

async function main(): Promise<number> {
  const command = argv[0];
  if (command === "run" || command === "score") {
    const json = argv.includes("--json");
    const clean = argv.slice(1).filter((a) => a !== "--json");
    if (command === "run") {
      const parsed = parseArgs({ args: clean, options: { model: { type: "string" }, provider: { type: "string" }, concurrency: { type: "string" }, timeout: { type: "string" }, retries: { type: "string" }, seed: { type: "string" }, "max-turns": { type: "string" }, "max-tool-calls": { type: "string" }, budget: { type: "string" } }, strict: true });
      const { model, provider } = parsed.values;
      if (!model || !provider) { console.error("run needs --model and --provider."); return 1; }
      const seed = Number(parsed.values.seed ?? 1);
      let adapter: ModelAdapter;
      if (provider === "mock") adapter = mockAdapter({ seed, ...(bench.definition.mockPolicies ? { policies: bench.definition.mockPolicies } : {}) });
      else if (provider === "openrouter") adapter = openrouterAdapter({ model });
      else if (provider === "openai") adapter = openaiCompatAdapter({ model });
      else { console.error("--provider must be openrouter, openai, or mock."); return 1; }
      const options: RunOptions = { seed };
      if (parsed.values.concurrency) options.concurrency = Number(parsed.values.concurrency);
      if (parsed.values.timeout) options.timeoutMs = Number(parsed.values.timeout);
      if (parsed.values.retries) options.retries = Number(parsed.values.retries);
      if (parsed.values["max-turns"]) options.maxTurns = Number(parsed.values["max-turns"]);
      if (parsed.values["max-tool-calls"]) options.maxToolCalls = Number(parsed.values["max-tool-calls"]);
      if (parsed.values.budget) options.budgetUsd = Number(parsed.values.budget);
      const report = await runWithDetails(bench, adapter, options);
      printReport(report, json);
      return report.rows.some((row) => row.error) ? 2 : 0;
    }
    const file = clean[0];
    if (!file) { console.error("score needs a results JSON file."); return 1; }
    const original = JSON.parse(await readFile(file, "utf8"));
    if (!Array.isArray(original?.rows)) { console.error("File is not a run report."); return 1; }
    const rows: DetailedRow[] = [];
    for (const row of original.rows) {
      const task = await bench.getTask(row.taskId);
      if (!task || row.submission === undefined) { console.error(`Cannot score task ${row.taskId}.`); return 1; }
      const grade = await bench.score(task, row.submission, { seed: original.seed });
      rows.push({ ...row, score: grade.score, reason: grade.reason, details: grade.details });
    }
    const scores = rows.map((r) => r.score);
    const report: DetailedReport = { ...original, rows, mean: scores.reduce((a, b) => a + b, 0) / scores.length, confidenceInterval95: bootstrapCI(scores, original.seed), grading: gradingSummary(rows) };
    printReport(report, json);
    return 0;
  }
  if (command === "mcp") {
    await mcpFor(bench).connect(new StdioServerTransport());
    return 0;
  }
  return createCli(bench, { bin: "benchmark-silent-constraints" }).main(argv);
}

if (process.exitCode === undefined) {
  try {
    process.exitCode = await main();
  } catch (caught) {
    console.error(caught instanceof Error ? caught.message : String(caught));
    process.exitCode = 2;
  }
}
