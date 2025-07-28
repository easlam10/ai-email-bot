// fetchEmails.js
import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { extractTextFromHtml } from "./extractText.js";
import { fileURLToPath } from "url";

dotenv.config();

const TOKEN_FILE = path.resolve("token.json");
const OUTPUT_FILE = path.resolve("emails.json");
const OUTLOOK_SCOPES = ["openid", "profile", "offline_access", "Mail.Read"];

// Use absolute paths for data files to work in any environment
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const PROCESSED_EMAILS_FILE = path.join(ROOT_DIR, "processedEmails.json");
const EXECUTION_TRACKER = path.join(ROOT_DIR, "executionTracker.json");

console.log(`Execution tracker path: ${EXECUTION_TRACKER}`);

const initExecutionTracker = () => {
  try {
    if (!fs.existsSync(EXECUTION_TRACKER)) {
      console.log("Creating new execution tracker file");
      fs.writeFileSync(
        EXECUTION_TRACKER,
        JSON.stringify(
          {
            lastExecutionDate: null,
            executionCount: 1, // Start at 1 instead of 0
          },
          null,
          2
        )
      );
      console.log("Execution tracker created successfully");
    }
  } catch (error) {
    console.error("Error initializing execution tracker:", error);
    // Create in current directory as fallback
    const fallbackPath = path.join(process.cwd(), "executionTracker.json");
    console.log(`Trying fallback path: ${fallbackPath}`);
    fs.writeFileSync(
      fallbackPath,
      JSON.stringify(
        {
          lastExecutionDate: null,
          executionCount: 1, // Start at 1 instead of 0
        },
        null,
        2
      )
    );
  }
};

export const getExecutionNumber = (preserve = false) => {
  initExecutionTracker();

  let tracker;
  try {
    tracker = JSON.parse(fs.readFileSync(EXECUTION_TRACKER));
    console.log(`Read execution tracker: ${JSON.stringify(tracker)}`);
  } catch (error) {
    console.error("Error reading execution tracker, creating new one:", error);
    tracker = {
      lastExecutionDate: null,
      executionCount: 1, // Start at 1 instead of 0
    };
  }

  const today = new Date().toDateString();

  if (!preserve) {
    if (tracker.lastExecutionDate !== today) {
      console.log(
        `New day detected. Resetting execution count. Old date: ${tracker.lastExecutionDate}, New date: ${today}`
      );
      tracker.lastExecutionDate = today;
      tracker.executionCount = 1;
    } else {
      console.log(
        `Same day. Incrementing execution count from ${
          tracker.executionCount
        } to ${tracker.executionCount + 1}`
      );
      tracker.executionCount += 1;
    }

    try {
      fs.writeFileSync(EXECUTION_TRACKER, JSON.stringify(tracker, null, 2));
      console.log(`Updated execution tracker: ${JSON.stringify(tracker)}`);
    } catch (error) {
      console.error("Error writing execution tracker:", error);
      // Try fallback location
      const fallbackPath = path.join(process.cwd(), "executionTracker.json");
      fs.writeFileSync(fallbackPath, JSON.stringify(tracker, null, 2));
    }
  }

  return tracker.executionCount;
};

// Ensure processed emails file exists
try {
  if (!fs.existsSync(PROCESSED_EMAILS_FILE)) {
    fs.writeFileSync(PROCESSED_EMAILS_FILE, JSON.stringify([]));
  }
} catch (error) {
  console.error("Error creating processed emails file:", error);
  // Create in current directory as fallback
  fs.writeFileSync("processedEmails.json", JSON.stringify([]));
}

export const fetchEmails = async () => {
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

  const mailResponse = await axios.get(
    `https://graph.microsoft.com/v1.0/me/messages?$filter=receivedDateTime ge ${isoToday}&$select=id,subject,from,receivedDateTime,body&$top=100&$orderby=receivedDateTime desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  let processedEmails = [];
  try {
    processedEmails = JSON.parse(fs.readFileSync(PROCESSED_EMAILS_FILE));
    if (!Array.isArray(processedEmails)) processedEmails = [];
  } catch {
    processedEmails = [];
  }

  const newEmails = await Promise.all(
    mailResponse.data.value
      .filter((mail) => {
        const receivedDate = new Date(mail.receivedDateTime);
        return receivedDate >= today && !processedEmails.includes(mail.id);
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
        };
      })
  );

  const updatedProcessed = [...processedEmails, ...newEmails.map((e) => e.id)];
  fs.writeFileSync(
    PROCESSED_EMAILS_FILE,
    JSON.stringify(updatedProcessed, null, 2)
  );
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(newEmails, null, 2));

  console.log(`✅ Saved ${newEmails.length} new emails to ${OUTPUT_FILE}`);
  return newEmails;
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
