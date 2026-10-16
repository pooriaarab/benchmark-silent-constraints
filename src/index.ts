import { type ModelAdapter, type RunOptions, type Trace } from "benchmark-core";
import { benchmark, createBenchmark } from "./benchmark.js";
import { runWithDetails } from "./report.js";
export { benchmark, createBenchmark };
export { gradingSummary, type DetailedReport, type DetailedRow, type GradingSummary } from "./report.js";
export const run = (adapter: ModelAdapter, options?: RunOptions & { tasksPath?: string }) => {
  const { tasksPath, ...rest } = options ?? {};
  return runWithDetails(tasksPath ? createBenchmark(tasksPath) : benchmark, adapter, rest);
};
export async function score(taskId: string, submission: Trace) {
  const task = await benchmark.getTask(taskId); if (!task) throw new Error(`Task not found: ${taskId}`);
  return benchmark.score(task, submission);
}
