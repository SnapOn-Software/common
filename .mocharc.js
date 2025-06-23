module.exports = {
    require: [
        "dotenv/config",
        "./lib/test/test/hooks.js",
    ],
    extension: ["js"],
    spec: "lib/test/test/**/*.js",
    recursive: true,
    reporter: "spec",
    slow: 0,
    timeout: 30_000,
};
