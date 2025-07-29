// Update index.js to use the new approach
import { fetchEmails, initializeDatabase } from "./fetchEmails.js";
import { categorizeEmails } from "./categorizeEmails.js";
import {
  sendWhatsAppCategorySummary,
  sendWhatsAppCategoryBreakdown,
} from "./whatsappService.js";
import { getExecutionTracker } from "./database/models.js";

// Main function to generate daily report
export const generateDailyReport = async () => {
  try {
    console.log("🚀 Starting email report generation...");

    // Initialize database connection
    await initializeDatabase();
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
    const result = await categorizeEmails(executionNumber);
    console.log("✅ Emails categorized successfully!");

    // 3️⃣ Send WhatsApp messages
    console.log("3. Sending WhatsApp messages...");

    // Send summary message
    await sendWhatsAppCategorySummary(result);

    // Add a delay between messages to ensure proper delivery order
    console.log("Waiting 5 seconds before sending breakdown message...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Send breakdown message
    await sendWhatsAppCategoryBreakdown(result);

    console.log("✅ WhatsApp messages sent successfully!");

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
