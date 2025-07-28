// cron-daily.js
// This script runs the daily email report at specific times each day (Pakistan time)
// Designed to be executed by a scheduler (like Heroku Scheduler) that runs every hour

const { exec } = require("child_process");

// Get current time in Pakistan (UTC+5)
const now = new Date();
const utcHour = now.getUTCHours();
const pakistanHour = (utcHour + 5) % 24; // Convert UTC to Pakistan time (UTC+5)

// Log execution for debugging
console.log(`Cron check at UTC ${now.toUTCString()}`);
console.log(`Pakistan time: ${pakistanHour}:${now.getUTCMinutes()}`);

// Run at 11 AM and 6 PM Pakistan time
if (pakistanHour === 11 || pakistanHour === 18) {
  console.log("Running daily email report...");

  // Execute the index.js file
  exec("node src/index.js", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    console.log(`Output: ${stdout}`);
    if (stderr) console.error(`Error output: ${stderr}`);
  });
} else {
  console.log(
    `Not scheduled to run at this hour in Pakistan (${pakistanHour})`
  );
}
