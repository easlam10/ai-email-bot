// fetchEmails.js
import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { extractTextFromHtml } from "./extractText.js";
import { fileURLToPath } from "url";
import {
  connectToDatabase,
  getExecutionTracker,
  saveEmails,
} from "./database/models.js";
import mongoose from "mongoose";

dotenv.config();

const TOKEN_FILE = path.resolve("token.json");
const OUTLOOK_SCOPES = ["openid", "profile", "offline_access", "Mail.Read"];

// Initialize database connection
export const initializeDatabase = async () => {
  await connectToDatabase();
};

export const getExecutionNumber = async (preserve = false) => {
  return await getExecutionTracker(preserve);
};

export const fetchEmails = async () => {
  try {
    // Ensure database is connected
    await initializeDatabase();

    if (!fs.existsSync(TOKEN_FILE)) {
      throw new Error("No token file found.");
    }

    const { refresh_token } = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
    const tokenData = await refreshAccessToken(refresh_token);

    fs.writeFileSync(
      TOKEN_FILE,
      JSON.stringify(
        {
          refresh_token: tokenData.refresh_token,
        },
        null,
        2
      )
    );

    const accessToken = tokenData.access_token;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isoToday = today.toISOString();

    console.log(`Fetching emails since ${isoToday}...`);
    const mailResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/me/messages?$filter=receivedDateTime ge ${isoToday}&$select=id,subject,from,receivedDateTime,body&$top=100&$orderby=receivedDateTime desc`,
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
          return receivedDate >= today;
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

const refreshAccessToken = async (refreshToken) => {
  const requestData = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: OUTLOOK_SCOPES.join(" "),
  });

  try {
    const response = await axios.post(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      requestData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return response.data;
  } catch (err) {
    console.error("❌ Failed to refresh token.");
    throw err;
  }
};
