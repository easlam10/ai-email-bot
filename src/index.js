// Update index.js to use the new approach
import { fetchEmails } from "./fetchEmails.js";
import { categorizeEmails } from "./categorizeEmails.js";
import {
  sendWhatsAppCategorySummary,
  sendWhatsAppCategoryBreakdown,
} from "./whatsappService.js";
import { connectToDatabase, getExecutionTracker } from "./database/models.js";

// Main function to generate daily report
export const generateDailyReport = async () => {
  try {
    console.log("🚀 Starting email report generation...");

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

    // 3️⃣ Send WhatsApp messages via Meta Cloud API
    console.log("3. Sending WhatsApp messages via Meta Cloud API...");

    // Send summary message
    console.log("📤 Sending summary message...");
    const summaryMessage = await sendWhatsAppCategorySummary(aiResult);
   

    // Add a small delay between messages
    console.log("⏳ Waiting 3 seconds before sending breakdown message...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Send breakdown message
    console.log("📤 Sending breakdown message...");
    const breakdownMessage = await sendWhatsAppCategoryBreakdown(aiResult);
    console.log("📨 Breakdown Message Response:");
    console.log(JSON.stringify(breakdownMessage, null, 2));

    console.log("✅ WhatsApp messages sent successfully via Meta Cloud API!");

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