// fetchEmails.js
import axios from "axios";
import dotenv from "dotenv";
import { extractTextFromHtml } from "./extractText.js";
import {
  connectToDatabase, // This is already imported from models.js
  getExecutionTracker,
  saveEmails,
} from "./database/models.js";
import { getAccessToken } from "./clientCredentialsAuth.js";

dotenv.config();

// Helper function to get the start of day in UTC+5 timezone (for production)
const getLocalMidnightSimple = () => {
  const now = new Date();
  // Get today's date in UTC+5
  const utcPlus5 = new Date(now.getTime() + 5 * 60 * 60 * 1000);

  // Create midnight in UTC+5, expressed as UTC
  return new Date(
    Date.UTC(
      utcPlus5.getUTCFullYear(),
      utcPlus5.getUTCMonth(),
      utcPlus5.getUTCDate()
    ) -
      5 * 60 * 60 * 1000
  ); // Subtract 5 hours to get UTC representation
};

export const fetchEmails = async (emailAddress) => {
  try {
    const accessToken = await getAccessToken();

    // Use UTC+5 timing for production (change to getUTCDateStart() for testing)
    const todayUTC = getLocalMidnightSimple();
    const isoUTC = todayUTC.toISOString();

    console.log(
      `Fetching emails for ${emailAddress} since ${isoUTC} (UTC+5)...`
    );

    const mailResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${emailAddress}/messages?$filter=receivedDateTime ge ${isoUTC}&$select=id,subject,from,receivedDateTime,body,webLink&$top=150&$orderby=receivedDateTime desc`,
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
          webLink: mail.webLink || null, // Add webLink to the email object
          processed: true,
          categorized: false,
        };
      })
    );

    console.log(`Processed ${allEmails.length} emails from API`);

    if (allEmails.length > 0) {
      const savedEmails = await saveEmails(allEmails, emailAddress);
      // Note: savedEmails includes both new and existing emails
      console.log(
        `✅ Processed ${savedEmails.length} emails for ${emailAddress} (see database logs above for new vs existing breakdown)`
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
