// test-evening-direct.js
// Direct test of evening run email fetching without database operations

import axios from "axios";
import { getAccessToken } from "./src/clientCredentialsAuth.js";
import { extractTextFromHtml } from "./src/extractText.js";
import fs from "fs";

const testEveningRunDirect = async () => {
  try {
    console.log("🧪 Testing 4pm PKT run (Evening) - Direct API test\n");

    // Get the current date in UTC
    const now = new Date();
    
    // Set to 10am PKT = 5am UTC (today)
    const startUTC = new Date(now);
    startUTC.setUTCHours(5, 0, 0, 0); // 10am PKT = 5am UTC
    
    // Set to 4pm PKT = 11am UTC (today)
    const endUTC = new Date(now);
    endUTC.setUTCHours(11, 0, 0, 0); // 4pm PKT = 11am UTC
    
    const startISO = startUTC.toISOString();
    const endISO = endUTC.toISOString();

    console.log(`🕙 Test simulates running at: 4pm PKT (11am UTC)`);
    console.log(`📅 Time range calculation:`);
    console.log(`   Start time (UTC): ${startISO}`);
    console.log(`   End time (UTC): ${endISO}`);
    
    // Convert to PKT for display
    const startPKT = new Date(startUTC.getTime() + 5 * 60 * 60 * 1000);
    const endPKT = new Date(endUTC.getTime() + 5 * 60 * 60 * 1000);
    console.log(`   Start time (PKT): ${startPKT.toISOString().replace('T', ' ').slice(0, 19)} PKT`);
    console.log(`   End time (PKT): ${endPKT.toISOString().replace('T', ' ').slice(0, 19)} PKT`);
    console.log(`   Expected: 10am PKT to 4pm PKT today\n`);

    // Get access token
    const accessToken = await getAccessToken();
    console.log("✅ Access token obtained\n");

    // Test with email address
    const testEmail = "md@kips.edu.pk";
    console.log(`📧 Testing with email: ${testEmail}\n`);

    // Build filter for time range
    const timeFilter = `receivedDateTime ge ${startISO} and receivedDateTime le ${endISO}`;
    console.log(`🔍 API Filter: ${timeFilter}\n`);

    // Make API call
    const mailResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${testEmail}/messages?$filter=${timeFilter}&$select=id,subject,from,receivedDateTime,body,webLink&$top=150&$orderby=receivedDateTime desc`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    console.log(`📊 API Response:`);
    console.log(`   Total emails from API: ${mailResponse.data.value.length}\n`);

    if (mailResponse.data.value.length > 0) {
      // Process emails
      const processedEmails = await Promise.all(
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
            receivedDateTime: mail.receivedDateTime,
            date: new Date(mail.receivedDateTime).toLocaleString(),
            body: latestReply,
            webLink: mail.webLink || null,
          };
        })
      );

      console.log(`✅ Processed ${processedEmails.length} emails\n`);

      // Save to JSON file
      const outputFile = `md-evening-run-emails.json`;
      fs.writeFileSync(outputFile, JSON.stringify({
        testInfo: {
          testDescription: "Evening run at 4pm PKT (11am UTC)",
          expectedTimeRange: "10am PKT to 4pm PKT today",
          startTimeUTC: startISO,
          endTimeUTC: endISO,
          startTimePKT: `${startPKT.toISOString().replace('T', ' ').slice(0, 19)} PKT`,
          endTimePKT: `${endPKT.toISOString().replace('T', ' ').slice(0, 19)} PKT`,
          totalEmails: processedEmails.length
        },
        emails: processedEmails
      }, null, 2));

      console.log(`✅ Email data saved to: ${outputFile}\n`);

      // Print all emails with PKT times
      console.log("📋 All fetched emails:");
      processedEmails.forEach((email, index) => {
        const receivedDate = new Date(email.receivedDateTime);
        const receivedPKT = new Date(receivedDate.getTime() + 5 * 60 * 60 * 1000);
        console.log(`${index + 1}. ${email.from?.email || email.from?.name || "Unknown"}`);
        console.log(`    Subject: ${email.subject}`);
        console.log(`    Received (UTC): ${email.receivedDateTime}`);
        console.log(`    Received (PKT): ${receivedPKT.toISOString().replace('T', ' ').slice(0, 19)} PKT`);
        console.log("");
      });

    } else {
      console.log("ℹ️ No emails found in the specified time range");
    }

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
};

// Run the test
testEveningRunDirect()
  .then(() => {
    console.log("\n✅ Evening run direct test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });