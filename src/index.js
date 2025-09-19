// Update index.js to use the new approach
import { fetchEmails } from "./fetchEmails.js";
import { categorizeEmails } from "./categorizeEmails.js";
import { sendConsolidatedEmailReport } from "./emailService.js";
import { connectToDatabase, getExecutionTracker } from "./database/models.js";

// Main function to generate daily report
export const generateDailyReport = async () => {
  try {
    console.log("🚀 Starting email report generation...");

    // Check if MongoDB URI is set
    if (!process.env.MONGODB_URI) {
      console.error("❌ MONGODB_URI environment variable is not set!");
      throw new Error("MONGODB_URI environment variable is required");
    }
    console.log("✓ MONGODB_URI environment variable found");

    // Initialize database connection - use connectToDatabase instead of initializeDatabase
    await connectToDatabase();
    console.log("✅ Database connection initialized!");

    // Get execution number FIRST - this handles day transitions at the beginning
    const executionNumber = await getExecutionTracker(false);
    console.log(`Today's execution number: ${executionNumber}`);

    // 1️⃣ Fetch emails
    console.log("1. Fetching emails...");
    const fetchedEmails = await fetchEmails();
    console.log("✅ Emails fetched successfully!");

    // 2️⃣ Categorize emails with AI
    console.log("2. Categorizing emails with AI...");
    const aiResult = await categorizeEmails(executionNumber);
    console.log("✅ Emails categorized successfully!");
    console.log("🤖 AI Result structure:", JSON.stringify(aiResult, null, 2));

    // 3️⃣ Send consolidated email report via Gmail
    console.log("3. Sending consolidated email report via Gmail...");
    await sendConsolidatedEmailReport(aiResult);
    console.log("✅ Email report sent successfully!");

    return { success: true };
  } catch (error) {
    console.error("❌ Report generation failed:", error);
    throw error;
  }
};

// Simply run the function directly - Windows has path format issues with the URL check
generateDailyReport()
  .then(() => console.log("✨ Daily report completed successfully!"))
  .catch((err) => console.error("❌ Error:", err));
