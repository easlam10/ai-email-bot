// cron-daily.js
// This script runs the daily email report at 17:18 (5:18 PM) each day in Pakistan time
// Designed to be executed by a scheduler (like Heroku Scheduler) that runs every hour

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Get current directory for proper path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get current time in Pakistan (UTC+5)
const now = new Date();
const utcHour = now.getUTCHours();
const utcMinute = now.getUTCMinutes();
const pakistanHour = (utcHour + 5) % 24; // Convert UTC to Pakistan time (UTC+5)

// Log execution for debugging
console.log(`Cron check at UTC ${now.toUTCString()}`);
console.log(`Pakistan time: ${pakistanHour}:${utcMinute.toString().padStart(2, '0')}`);

// Run at 5:18 PM (17:18) Pakistan time
if (pakistanHour === 17 && utcMinute === 20) {
  console.log("Running daily email report...");

  // Execute the index.js file using spawn for real-time output
  const child = spawn("node", ["src/index.js"], {
    stdio: "inherit", // Stream output directly to console
    shell: true,
  });

  child.on("error", (error) => {
    console.error(`Failed to start subprocess: ${error}`);
  });

  child.on("close", (code) => {
    console.log(`Email report process completed with code ${code}`);
  });
} else {
  console.log(
    `Not scheduled to run at this time in Pakistan (${pakistanHour}:${utcMinute.toString().padStart(2, '0')})`
  );
}






// cron-daily.js
// This script runs the daily email report at specific times each day (Pakistan time)
// Designed to be executed by a scheduler (like Heroku Scheduler) that runs every hour

// import { spawn } from "child_process";
// import { fileURLToPath } from "url";
// import { dirname, resolve } from "path";

// // Get current directory for proper path resolution
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// Get current time in Pakistan (UTC+5)
// const now = new Date();
// const utcHour = now.getUTCHours();
// const pakistanHour = (utcHour + 5) % 24; // Convert UTC to Pakistan time (UTC+5)

// // Log execution for debugging
// console.log(`Cron check at UTC ${now.toUTCString()}`);
// console.log(`Pakistan time: ${pakistanHour}:${now.getUTCMinutes()}`);

// // Run at 11 AM and 6 PM Pakistan time
// if (pakistanHour === 10 || pakistanHour === 16) {
//   console.log("Running daily email report...");

//   // Execute the index.js file using spawn for real-time output
//   const child = spawn("node", ["src/index.js"], {
//     stdio: "inherit", // Stream output directly to console
//     shell: true,
//   });

//   child.on("error", (error) => {
//     console.error(`Failed to start subprocess: ${error}`);
//   });

//   child.on("close", (code) => {
//     console.log(`Email report process completed with code ${code}`);
//   });
// } else {
//   console.log(
//     `Not scheduled to run at this hour in Pakistan (${pakistanHour})`
//   );
// }
