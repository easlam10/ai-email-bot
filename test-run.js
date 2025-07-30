// test-run.js
// This script forces execution by overriding the time check
// Used to test the timezone fixes without waiting for 2:10 AM

import { exec, spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🧪 Running test simulation for 2:10 AM Pakistan time");
console.log("Current actual time: " + new Date().toLocaleString());
console.log("Current working directory: " + process.cwd());
console.log("Executing index.js directly to test timezone fixes...");

// Method 1: Execute as a separate process with streaming output
console.log("\n--- METHOD 1: Using spawn to see real-time output ---");
const child = spawn("node", ["src/index.js"], {
  stdio: "inherit", // This will stream the output directly to the console
  shell: true,
});

child.on("error", (error) => {
  console.error(`Failed to start subprocess: ${error}`);
});

child.on("close", (code) => {
  console.log(`Child process exited with code ${code}`);

  // Method 2: Try with exec as fallback
  console.log("\n--- METHOD 2: Using exec as fallback ---");
  exec("node src/index.js", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing script: ${error.message}`);
    }
    if (stdout) console.log(`Stdout: ${stdout}`);
    if (stderr) console.error(`Stderr: ${stderr}`);

    // Method 3: Try dynamic import as last resort
    console.log("\n--- METHOD 3: Trying dynamic import ---");
    try {
      console.log("Attempting to import src/index.js dynamically...");
      // Using dynamic import instead of require
      import("./src/index.js")
        .then(() => console.log("Import successful"))
        .catch((err) => console.error("Error importing index.js:", err));
    } catch (err) {
      console.error("Error with dynamic import:", err);
    }
  });
});
