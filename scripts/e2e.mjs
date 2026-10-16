import assert from "node:assert/strict";
import { execFile as execFileCallback, spawn } from "node:child_process";
import { once } from "node:events";
import { createServer as createNetServer } from "node:net";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const execFile = promisify(execFileCallback);

await execFile("npm", ["run", "build"]);
const cli = await execFile(process.execPath, ["dist/cli.js", "run", "--model", "offline", "--provider", "mock", "--json"], { maxBuffer: 1_000_000 });
const report = JSON.parse(cli.stdout);
assert.equal(report.rows.length, 40);
assert.ok(report.rows.some((row) => row.score === 1));
assert.ok(report.rows.some((row) => row.score === 0));

const { benchmark } = await import("../dist/index.js");
const tasks = await benchmark.listTasks();
assert.equal(tasks.length, 40);
let cleanSolutions = 0, goalMetButViolated = 0, goalUnmet = 0;
for (const task of tasks) {
  const good = await benchmark.score(task, { toolLog: task.metadata.solution });
  assert.equal(good.score, 1, `${task.id}: clean solution must score 1, got '${good.reason}'`);
  assert.equal(good.details.cleanSuccess, true);
  cleanSolutions++;
  const short = await benchmark.score(task, { toolLog: task.metadata.shortcut });
  assert.equal(short.score, 0, `${task.id}: shortcut must score 0`);
  assert.ok(short.details.goalMet === false || short.details.invariantViolations.length > 0, `${task.id}: shortcut produced no grading signal`);
  if (short.details.goalMet) goalMetButViolated++; else goalUnmet++;
}
assert.ok(goalMetButViolated > tasks.length / 2, "most shortcuts should meet the goal while violating");

// Provider tool APIs (OpenAI, Gemini) reject loose schemas: every array needs
// items, every object needs properties, recursively.
const checkSchema = (node, where) => {
  if (!node || typeof node !== "object") return;
  if (node.type === "array") {
    assert.ok(node.items, `${where}: array schema has no items`);
    checkSchema(node.items, `${where}.items`);
  }
  if (node.type === "object") {
    assert.ok(node.properties && typeof node.properties === "object", `${where}: object schema has no properties`);
    for (const [key, value] of Object.entries(node.properties)) checkSchema(value, `${where}.${key}`);
  }
};
const envToolNames = new Set();
for (const task of tasks) {
  const start = await benchmark.definition.environment(task).reset(task, 0);
  for (const tool of start.tools) {
    if (envToolNames.has(tool.name)) continue;
    envToolNames.add(tool.name);
    checkSchema(tool.parameters, tool.name);
  }
}
assert.equal(envToolNames.size, 20);

const probeTask = tasks.find((task) => task.id === "sc-fs-01");
const badSubmissions = {
  "no submission": {},
  "empty tool log": { toolLog: [] },
  "answer only": { answer: "Done, everything is cleaned up." },
  "same call repeated": { toolLog: Array(5).fill({ name: "fs_list", args: {} }) },
  "unknown tool": { toolLog: [{ name: "nuke_everything", args: {} }, { name: "fs_delete", args: { path: "backups/full-2025.tar" } }] },
};
for (const [label, submission] of Object.entries(badSubmissions)) {
  const res = await benchmark.score(probeTask, submission);
  assert.equal(res.score, 0, `bad submission '${label}' scored ${res.score} (${res.reason})`);
}

const probe = createNetServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const address = probe.address(); assert.ok(address && typeof address === "object");
await new Promise((resolve) => probe.close(resolve));
const server = spawn(process.execPath, ["dist/cli.js", "serve", String(address.port)], { stdio: ["ignore", "pipe", "pipe"] });
const base = `http://127.0.0.1:${address.port}`; const routes = {};
async function get(path) {
  const response = await fetch(`${base}${path}`); routes[`GET ${path}`] = response.status;
  return { response, value: await response.json() };
}
try {
  for (let attempt = 0; attempt < 100; attempt++) { try { await get("/health"); break; } catch { await new Promise((resolve) => setTimeout(resolve, 20)); } }
  const health = await get("/health"); assert.equal(health.response.status, 200);
  const listed = await get("/v1/tasks"); assert.equal(listed.value.tasks.length, 40);
  const shown = await get("/v1/tasks/sc-fs-01"); assert.equal(shown.value.task.id, "sc-fs-01");
  const score = await fetch(`${base}/v1/score`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ taskId: "sc-fs-01", submission: report.rows[0].submission }) });
  routes["POST /v1/score"] = score.status; assert.equal(score.status, 200);
  assert.equal((await get("/v1/provenance")).response.status, 200);
  assert.equal((await get("/v1/index-entry")).value.task_count, 40);
} finally { if (server.exitCode === null) { server.kill("SIGTERM"); await once(server, "exit"); } }

const transport = new StdioClientTransport({ command: process.execPath, args: ["dist/cli.js", "mcp"], cwd: process.cwd(), stderr: "pipe" });
const client = new Client({ name: "benchmark-silent-constraints-e2e", version: "0.1.0" });
await client.connect(transport); let toolNames;
try {
  const available = await client.listTools(); toolNames = available.tools.map((tool) => tool.name).sort();
  assert.deepEqual(toolNames, ["get_provenance", "get_task", "list_tasks", "run_benchmark", "score_answer"]);
  const calls = [
    ["list_tasks", {}], ["get_task", { taskId: "sc-fs-01" }],
    ["score_answer", { taskId: "sc-fs-01", submission: report.rows[0].submission }],
    ["get_provenance", {}], ["run_benchmark", { model: "offline" }],
  ];
  for (const [name, args] of calls) {
    const result = await client.callTool({ name, arguments: args });
    if (name === "run_benchmark") assert.equal(result.isError, true); else assert.notEqual(result.isError, true);
  }
} finally { await client.close(); }

const artifact = { task_count: report.rows.length, scores: report.rows.map((row) => row.score), clean_solutions: cleanSolutions, goal_met_but_violated: goalMetButViolated, goal_unmet: goalUnmet, route_status_codes: routes, tool_names: toolNames };
await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/e2e-report.json", `${JSON.stringify(artifact, null, 2)}\n`);
assert.match(await readFile("data/PROVENANCE.md", "utf8"), /Seeded silent-constraints task generator/);
console.log(`e2e: ${artifact.task_count} tasks, ${Object.keys(routes).length} routes, ${toolNames.length} tools -> all surfaces passed, ok`);
