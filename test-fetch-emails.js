import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import { extractTextFromHtml } from "./src/extractText.js";
import { getAccessToken } from "./src/clientCredentialsAuth.js";

dotenv.config();

// Helper function to get the start of day in UTC+5 timezone
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

// Function to fetch emails for a specific day
const fetchEmailsForDay = async (emailAddress, targetDate = null) => {
  try {
    console.log("🔑 Getting access token...");
    const accessToken = await getAccessToken();

    // Use provided date or default to today
    const dayStart = targetDate
      ? new Date(targetDate)
      : getLocalMidnightSimple();
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours

    const startISO = dayStart.toISOString();
    const endISO = dayEnd.toISOString();

    console.log(`📧 Fetching emails for ${emailAddress}`);
    console.log(`📅 Date range: ${startISO} to ${endISO}`);

    // Fetch emails from Microsoft Graph API
    const mailResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${emailAddress}/messages?$filter=receivedDateTime ge ${startISO} and receivedDateTime lt ${endISO}&$select=id,subject,from,receivedDateTime,body,webLink&$top=999&$orderby=receivedDateTime desc`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    console.log(`📬 Total emails fetched: ${mailResponse.data.value.length}`);

    // Process all emails
    const processedEmails = await Promise.all(
      mailResponse.data.value.map(async (mail, index) => {
        console.log(
          `Processing email ${index + 1}/${mailResponse.data.value.length}: ${
            mail.subject
          }`
        );

        const fullText = await extractTextFromHtml(mail.body?.content || "");
        const latestReply = fullText.split(/From: /i)[0].trim();

        return {
          id: mail.id,
          subject: mail.subject?.trim() || "(No Subject)",
          sender: {
            name: mail.from?.emailAddress?.name || "Unknown",
            email: mail.from?.emailAddress?.address || "unknown@example.com",
          },
          receivedDateTime: mail.receivedDateTime,
          body: latestReply,
          webLink: mail.webLink || null,
        };
      })
    );

    return processedEmails;
  } catch (error) {
    console.error(
      "❌ Error fetching emails:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    const emailAddress = "ce@kips.edu.pk";

    // You can specify a specific date here, or leave null for today
    // Example: const targetDate = "2025-09-25T00:00:00.000Z";
    const targetDate = null; // Use null for today, or specify a date string

    console.log("🚀 Starting email fetch test...");

    const emails = await fetchEmailsForDay(emailAddress, targetDate);

    // Create output object with metadata
    const output = {
      metadata: {
        emailAddress: emailAddress,
        fetchDate: new Date().toISOString(),
        targetDate: targetDate || getLocalMidnightSimple().toISOString(),
        totalEmails: emails.length,
      },
      emails: emails,
    };

    // Write to JSON file
    const outputFileName = `emails-${emailAddress.replace("@", "-at-")}-${
      new Date().toISOString().split("T")[0]
    }.json`;

    fs.writeFileSync(outputFileName, JSON.stringify(output, null, 2));

    console.log(`✅ Successfully fetched ${emails.length} emails!`);
    console.log(`📄 Results saved to: ${outputFileName}`);
    console.log("\n📊 Summary:");
    console.log(`   Email Address: ${emailAddress}`);
    console.log(`   Total Emails: ${emails.length}`);
    console.log(`   Output File: ${outputFileName}`);

    // Show first few email subjects as preview
    if (emails.length > 0) {
      console.log("\n📋 First few emails:");
      emails.slice(0, 5).forEach((email, index) => {
        console.log(
          `   ${index + 1}. ${email.subject} (from: ${email.sender.email})`
        );
      });
      if (emails.length > 5) {
        console.log(`   ... and ${emails.length - 5} more emails`);
      }
    }
  } catch (error) {
    console.error("❌ Test script failed:", error);
    process.exit(1);
  }
};

// Run the script
main();
