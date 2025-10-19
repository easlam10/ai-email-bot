// Update index.js to use the new approach
import { fetchEmails } from "./fetchEmails.js";
import { categorizeEmails } from "./categorizeEmails.js";
import { sendConsolidatedEmailReport } from "./emailService.js";
import { connectToDatabase, getExecutionTracker } from "./database/models.js";
import { EMAIL_ADDRESSES } from "./clientCredentialsAuth.js";

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

    // Process each email account separately
    for (let i = 0; i < EMAIL_ADDRESSES.length; i++) {
      const emailAddress = EMAIL_ADDRESSES[i];
      const recipientIndex = i + 1; // 1 for first email, 2 for second email

      console.log(
        `\n📧 Processing email account ${i + 1}/${
          EMAIL_ADDRESSES.length
        }: ${emailAddress}`
      );

      // 1️⃣ Fetch emails for this account
      console.log(`1. Fetching emails for ${emailAddress}...`);
      const fetchedEmails = await fetchEmails(emailAddress, executionNumber);
      console.log(
        `✅ Emails fetched successfully for ${emailAddress}! (${fetchedEmails.length} emails)`
      );

      // 2️⃣ Categorize emails for this account with AI
      console.log(`2. Categorizing emails for ${emailAddress} with AI...`);
      const aiResult = await categorizeEmails(
        fetchedEmails,
        executionNumber,
        emailAddress
      );
      console.log(`✅ Emails categorized successfully for ${emailAddress}!`);

      // 3️⃣ Send separate email report for this account
      console.log(`3. Sending email report for ${emailAddress} via Gmail...`);
      await sendConsolidatedEmailReport(aiResult, recipientIndex);
      console.log(`✅ Email report sent successfully for ${emailAddress}!`);
    }

    console.log(
      `\n✅ All ${EMAIL_ADDRESSES.length} email accounts processed and reports sent!`
    );

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
