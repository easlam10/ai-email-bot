// fetchEmails.js
import axios from "axios";
import dotenv from "dotenv";
import { extractTextFromHtml } from "./extractText.js";
import {
  connectToDatabase, // This is already imported from models.js
  getExecutionTracker,
  saveEmails,
} from "./database/models.js";
import { getAccessToken, EMAIL_ADDRESS } from "./clientCredentialsAuth.js";

dotenv.config();


// Helper function to get the start of day in UTC+5 timezone (for production)
const getUTCPLUS5DateStart = () => {
  const now = new Date();
  // Convert to UTC+5 (5 hours ahead of UTC)
  const utcPlus5Date = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  // Create UTC+5 start of day using Date.UTC()
  return new Date(
    Date.UTC(
      utcPlus5Date.getUTCFullYear(),
      utcPlus5Date.getUTCMonth(),
      utcPlus5Date.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
};

export const fetchEmails = async () => {
  try {
    // Use the connectToDatabase imported from models.js
    await connectToDatabase();
    const accessToken = await getAccessToken();

    // Use UTC+5 timing for production (change to getUTCDateStart() for testing)
    const todayUTC = getUTCPLUS5DateStart();
    const isoUTC = todayUTC.toISOString();

    console.log(`Fetching emails since ${isoUTC} (UTC+5)...`);

    const mailResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${EMAIL_ADDRESS}/messages?$filter=receivedDateTime ge ${isoUTC}&$select=id,subject,from,receivedDateTime,body&$top=150&$orderby=receivedDateTime desc`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    console.log(
      `Total emails fetched from API: ${mailResponse.data.value.length}`
    );

    // Process all emails (already filtered by API)
    const allEmails = await Promise.all(
      mailResponse.data.value.map(async (mail) => {
        const fullText = await extractTextFromHtml(mail.body?.content || "");
        const latestReply = fullText.split(/From: /i)[0].trim();
        return {
          id: mail.id,
          subject: mail.subject?.trim() || "(No Subject)",
          from: {
            name: mail.from?.emailAddress?.name || "Unknown",
            email: mail.from?.emailAddress?.address || "unknown@example.com",
          },
          date: new Date(mail.receivedDateTime).toLocaleString(),
          body: latestReply,
          processed: true,
          categorized: false,
        };
      })
    );

    console.log(`Processed ${allEmails.length} emails from API`);

    if (allEmails.length > 0) {
      const savedEmails = await saveEmails(allEmails);
      console.log(`✅ Saved ${savedEmails.length} unique emails to database`);
      console.log(
        `✅ Returning ${savedEmails.length} unique emails for categorization`
      );
      return savedEmails;
    }

    console.log(`✅ No emails to save, returning empty array`);
    return [];
  } catch (error) {
    console.error("Error fetching emails:", error);
    throw error;
  }
};
