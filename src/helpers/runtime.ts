const runtimeGlobals = globalThis as {
  importScripts?: unknown;
  process?: {
    versions?: {
      node?: unknown;
    };
    release?: {
      name?: unknown;
    };
  };
};

export function detectRuntime(): "browser" | "node" | "worker" | "unknown" {
  // Browser main thread
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return "browser";
  }

  // Web Worker / Service Worker
  if (
    typeof self !== "undefined" &&
    typeof runtimeGlobals.importScripts === "function" &&
    typeof window === "undefined"
  ) {
    return "worker";
  }

  // Real Node.js (avoids many browser polyfill false positives)
  if (
    typeof runtimeGlobals.process !== "undefined" &&
    typeof runtimeGlobals.process?.versions === "object" &&
    !!runtimeGlobals.process?.versions?.node &&
    runtimeGlobals.process?.release?.name === "node"
  ) {
    return "node";
  }

  return "unknown";
}

export const isBrowser = () => detectRuntime() === "browser";
export const isNode = () => detectRuntime() === "node";