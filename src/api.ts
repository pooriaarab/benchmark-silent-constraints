import { createHandler } from "benchmark-core";
import { benchmark, createBenchmark, resolveTasksPath } from "./benchmark.js";
export const createApi = (tasksPath?: string) => createHandler(tasksPath === undefined ? benchmark : createBenchmark(resolveTasksPath(tasksPath)));
export const handler = createApi();
