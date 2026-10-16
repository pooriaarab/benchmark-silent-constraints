#!/usr/bin/env node
import { createCli } from "benchmark-core";
import { createBenchmark } from "./benchmark.js";

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
if (process.exitCode === undefined) {
  process.exitCode = await createCli(createBenchmark(tasksPath), { bin: "benchmark-silent-constraints" }).main(argv);
}
