import { createMcpServer as create, startMcp as start } from "benchmark-core";
import { benchmark, createBenchmark, resolveTasksPath } from "./benchmark.js";
const pick = (tasksPath?: string) => (tasksPath === undefined ? benchmark : createBenchmark(resolveTasksPath(tasksPath)));
export const createMcpServer = (tasksPath?: string) => create(pick(tasksPath));
export const startMcp = (tasksPath?: string) => start(pick(tasksPath));
