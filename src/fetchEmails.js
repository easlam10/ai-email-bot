// fetchEmails.js
import axios from "axios";
import dotenv from "dotenv";
import { extractTextFromHtml } from "./extractText.js";
import { fileURLToPath } from "url";
import {
  connectToDatabase,
  getExecutionTracker,
  saveEmails,
} from "./database/models.js";
import mongoose from "mongoose";
import { getAccessToken, EMAIL_ADDRESS } from "./clientCredentialsAuth.js";

dotenv.config();

// Initialize database connection
export const initializeDatabase = async () => {
  await connectToDatabase();
};

export const getExecutionNumber = async (preserve = false) => {
  return await getExecutionTracker(preserve);
};

// Helper function to get the start of day in local timezone
const getLocalDateStart = () => {
  const now = new Date();
  const localDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
  return localDate;
};

// Helper function to convert local date to UTC ISO string for API filtering
const getUTCFilterDate = (localDate) => {
  return localDate.toISOString();
};

export const fetchEmails = async () => {
  try {
    // Ensure database is connected
    await initializeDatabase();

    // Get a valid access token from database or Microsoft Graph API
    const accessToken = await getAccessToken();

    // Use local timezone for date calculations
    const todayLocal = getLocalDateStart();
    const isoTodayUTC = getUTCFilterDate(todayLocal);

    console.log(`Local date for filtering: ${todayLocal.toLocaleString()}`);
    console.log(`Fetching emails for ${EMAIL_ADDRESS} since ${isoTodayUTC}...`);

    // Use /users/{email} endpoint instead of /me for app-only authentication
    const mailResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${EMAIL_ADDRESS}/messages?$filter=receivedDateTime ge ${isoTodayUTC}&$select=id,subject,from,receivedDateTime,body&$top=100&$orderby=receivedDateTime desc`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    console.log(
      `Total emails fetched from API: ${mailResponse.data.value.length}`
    );

    // Process all emails and mark them as processed immediately
    const allEmails = await Promise.all(
      mailResponse.data.value
        .filter((mail) => {
          const receivedDate = new Date(mail.receivedDateTime);
          // Compare using timestamps to ensure consistent timezone handling
          return receivedDate >= todayLocal;
        })
        .map(async (mail) => {
          const fullText = await extractTextFromHtml(mail.body?.content || "");
          const latestReply = fullText.split(/From: /i)[0].trim(); // Remove quoted email history
          return {
            id: mail.id,
            subject: mail.subject?.trim() || "(No Subject)",
            from: {
              name: mail.from?.emailAddress?.name || "Unknown",
              email: mail.from?.emailAddress?.address || "unknown@example.com",
            },
            date: new Date(mail.receivedDateTime).toLocaleString(),
            body: latestReply,
            processed: true, // Mark as processed right away
            categorized: false, // Not yet categorized
          };
        })
    );

    console.log(`Processed ${allEmails.length} emails from API`);

    // Save emails to database (only new ones will be inserted due to upsert operation)
    if (allEmails.length > 0) {
      await saveEmails(allEmails);
    }

    // Return all emails from this fetch - already marked as processed
    console.log(`✅ Returning ${allEmails.length} emails for categorization`);
    return allEmails;
  } catch (error) {
    console.error("Error fetching emails:", error);
    throw error;
  }
};

// End of file
