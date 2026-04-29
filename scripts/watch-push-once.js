const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const rootDir = process.cwd();
const libDir = path.join(rootDir, "lib");
const targetPrefixes = ["esm", "cjs"];
const debounceMs = 1000;

let pushRunning = false;
let pendingPush = false;
let lastEventAt = 0;
let debounceTimer = null;

function shouldTrigger(filePath) {
    if (!filePath) return false;
    const normalized = filePath.replace(/\\/g, "/");
    if (!targetPrefixes.some((prefix) => normalized.startsWith(prefix + "/"))) {
        return false;
    }

    return normalized.endsWith(".js") || normalized.endsWith(".d.ts") || normalized.endsWith(".map");
}

function scheduleDebouncedPush(delay = debounceMs) {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
        debounceTimer = null;
        maybeRunPush();
    }, delay);
}

function onBuildEvent(filePath) {
    const normalized = filePath.replace(/\\/g, "/");
    const matched = targetPrefixes.find((prefix) => normalized.startsWith(prefix + "/"));
    if (!matched) return;

    pendingPush = true;
    lastEventAt = Date.now();
    scheduleDebouncedPush(debounceMs);
}

function maybeRunPush() {
    if (!pendingPush) return;

    const quietFor = Date.now() - lastEventAt;
    if (quietFor < debounceMs) {
        scheduleDebouncedPush(debounceMs - quietFor);
        return;
    }

    if (pushRunning) {
        scheduleDebouncedPush(debounceMs);
        return;
    }

    runPush();
}

function runPush() {
    pushRunning = true;
    pendingPush = false;

    console.log("[watch:push-once] Build output settled. Running watch-push...");

    const child = spawn("npm", ["run", "watch-push"], {
        stdio: "inherit",
        shell: process.platform === "win32",
    });

    child.on("error", (err) => {
        pushRunning = false;
        console.error(`[watch:push-once] Failed to spawn watch-push: ${err.message}`);
        process.exit(1);
    });

    child.on("exit", (code) => {
        pushRunning = false;

        if (code === 0) {
            console.log("[watch:push-once] watch-push finished.");
            if (pendingPush) {
                scheduleDebouncedPush(debounceMs);
            }
            return;
        }

        console.error(`[watch:push-once] watch-push failed with exit code ${code}.`);
        process.exit(code || 1);
    });
}

if (!fs.existsSync(libDir)) {
    console.log("[watch:push-once] Waiting for lib folder to be created...");
}

const watchTarget = fs.existsSync(libDir) ? libDir : rootDir;

const watcher = fs.watch(
    watchTarget,
    { recursive: true },
    (_eventType, fileName) => {
        if (watchTarget === rootDir) {
            if (!fileName || !fileName.replace(/\\/g, "/").startsWith("lib/")) return;
            const rel = fileName.replace(/\\/g, "/").slice(4);
            if (shouldTrigger(rel)) onBuildEvent(rel);
            return;
        }

        if (shouldTrigger(fileName)) onBuildEvent(fileName);
    }
);

watcher.on("error", (err) => {
    console.error("[watch:push-once] Watcher error:", err.message);
    process.exit(1);
});

console.log("[watch:push-once] Listening for build output in lib/esm and lib/cjs (1s debounce)...");