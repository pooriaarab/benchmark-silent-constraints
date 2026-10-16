import { run as coreRun, type Benchmark, type JsonValue, type ModelAdapter, type RunOptions, type RunReport, type RunRow } from "benchmark-core";

export type DetailedRow = RunRow & { details?: JsonValue };
export interface GradingSummary { goalMet: number; cleanSuccess: number; invariantViolations: number }
export type DetailedReport = Omit<RunReport, "rows"> & { rows: DetailedRow[]; grading: GradingSummary };

export function gradingSummary(rows: DetailedRow[]): GradingSummary {
  const details = rows.map((r) => r.details).filter((d): d is Record<string, JsonValue> => typeof d === "object" && d !== null && !Array.isArray(d));
  return {
    goalMet: details.filter((d) => d.goalMet === true).length,
    cleanSuccess: details.filter((d) => d.cleanSuccess === true).length,
    invariantViolations: details.reduce((n, d) => n + (Array.isArray(d.invariantViolations) ? d.invariantViolations.length : 0), 0),
  };
}

// benchmark-core's run() drops TaskScore.details. Re-grade each row's
// submission here so reports carry goalMet, invariantViolations and
// cleanSuccess on every surface.
export async function addGradingDetails(benchmark: Benchmark, report: RunReport): Promise<DetailedReport> {
  const rows: DetailedRow[] = [];
  for (const row of report.rows) {
    const task = row.submission === undefined ? undefined : await benchmark.getTask(row.taskId);
    const details = task ? (await benchmark.score(task, row.submission!, { seed: report.seed })).details : undefined;
    rows.push(details === undefined ? row : { ...row, details });
  }
  return { ...report, rows, grading: gradingSummary(rows) };
}

export function runWithDetails(benchmark: Benchmark, adapter: ModelAdapter, options?: RunOptions): Promise<DetailedReport> {
  return coreRun(benchmark, adapter, options).then((report) => addGradingDetails(benchmark, report));
}
