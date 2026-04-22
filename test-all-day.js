// test-all-day-emails.js
// Test script to fetch all emails for an entire day (midnight to midnight PKT)

import axios from "axios";
import { getAccessToken } from "./src/clientCredentialsAuth.js";
import { extractTextFromHtml } from "./src/extractText.js";
import fs from "fs";

const testAllDayEmails = async () => {
  try {
    console.log("🧪 Testing Full Day Email Fetch - Midnight to Midnight PKT\n");

    // Get the current date in UTC
    const now = new Date();
    
    // Set to midnight PKT (start of day) = 7pm UTC previous day
    // PKT is UTC+5, so midnight PKT = 19:00 UTC previous day
    const startUTC = new Date(now);
    startUTC.setUTCDate(startUTC.getUTCDate() - 1); // Go to yesterday
    startUTC.setUTCHours(19, 0, 0, 0); // 12am PKT = 7pm UTC (previous day)
    
    // Set to midnight PKT (end of day) = 7pm UTC current day
    const endUTC = new Date(now);
    endUTC.setUTCHours(19, 0, 0, 0); // 12am PKT next day = 7pm UTC (current day)
    
    const startISO = startUTC.toISOString();
    const endISO = endUTC.toISOString();

    console.log(`📅 Fetching full day of emails:`);
    console.log(`   Start time (UTC): ${startISO}`);
    console.log(`   End time (UTC): ${endISO}`);
    
    // Convert to PKT for display
    const startPKT = new Date(startUTC.getTime() + 5 * 60 * 60 * 1000);
    const endPKT = new Date(endUTC.getTime() + 5 * 60 * 60 * 1000);
    console.log(`   Start time (PKT): ${startPKT.toISOString().replace('T', ' ').slice(0, 19)} PKT`);
    console.log(`   End time (PKT): ${endPKT.toISOString().replace('T', ' ').slice(0, 19)} PKT`);
    console.log(`   Duration: 24 hours (full day)\n`);

    // Get access token
    const accessToken = await getAccessToken();
    console.log("✅ Access token obtained\n");

    // Test with email address
    const testEmail = "md@kips.edu.pk";
    console.log(`📧 Fetching all emails for: ${testEmail}\n`);

    // Build filter for time range
    const timeFilter = `receivedDateTime ge ${startISO} and receivedDateTime le ${endISO}`;
    console.log(`🔍 API Filter: ${timeFilter}\n`);

    // Make API call
    const mailResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${testEmail}/messages?$filter=${timeFilter}&$select=id,subject,from,receivedDateTime,body,webLink&$top=500&$orderby=receivedDateTime desc`,
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
            body: latestReply.substring(0, 200) + (latestReply.length > 200 ? "..." : ""), // Truncate for file size
            webLink: mail.webLink || null,
          };
        })
      );

      console.log(`✅ Processed ${processedEmails.length} emails\n`);

      // Group emails by hour (PKT)
      const emailsByHour = {};
      processedEmails.forEach(email => {
        const receivedDate = new Date(email.receivedDateTime);
        const receivedPKT = new Date(receivedDate.getTime() + 5 * 60 * 60 * 1000);
        const hourPKT = receivedPKT.getUTCHours();
        const hourLabel = `${hourPKT.toString().padStart(2, '0')}:00 PKT`;
        
        if (!emailsByHour[hourLabel]) {
          emailsByHour[hourLabel] = [];
        }
        emailsByHour[hourLabel].push(email);
      });

      // Save to JSON file
      const outputFile = `all-day-emails.json`;
      fs.writeFileSync(outputFile, JSON.stringify({
        testInfo: {
          testDescription: "Full day email fetch (midnight to midnight PKT)",
          emailAddress: testEmail,
          startTimeUTC: startISO,
          endTimeUTC: endISO,
          startTimePKT: `${startPKT.toISOString().replace('T', ' ').slice(0, 19)} PKT`,
          endTimePKT: `${endPKT.toISOString().replace('T', ' ').slice(0, 19)} PKT`,
          totalEmails: processedEmails.length,
          emailsByHour: Object.keys(emailsByHour).sort().reduce((acc, key) => {
            acc[key] = emailsByHour[key].length;
            return acc;
          }, {})
        },
        emails: processedEmails
      }, null, 2));

      console.log(`✅ Email data saved to: ${outputFile}\n`);

      // Print summary by hour
      console.log("📊 Email Distribution by Hour (PKT):");
      console.log("─".repeat(50));
      Object.keys(emailsByHour).sort().forEach(hour => {
        const count = emailsByHour[hour].length;
        const bar = "█".repeat(Math.min(count, 50));
        console.log(`${hour}: ${bar} (${count} emails)`);
      });
      console.log("─".repeat(50));

      // Print sample emails
      console.log("\n📋 Sample of fetched emails (first 10):");
      processedEmails.slice(0, 10).forEach((email, index) => {
        const receivedDate = new Date(email.receivedDateTime);
        const receivedPKT = new Date(receivedDate.getTime() + 5 * 60 * 60 * 1000);
        console.log(`\n${index + 1}. From: ${email.from?.email || email.from?.name || "Unknown"}`);
        console.log(`   Subject: ${email.subject}`);
        console.log(`   Received (UTC): ${email.receivedDateTime}`);
        console.log(`   Received (PKT): ${receivedPKT.toISOString().replace('T', ' ').slice(0, 19)} PKT`);
      });

      // Check coverage for scheduled runs
      console.log("\n\n🔍 Coverage Analysis for Scheduled Runs:");
      console.log("─".repeat(50));
      
      // Morning run should cover: 4pm yesterday to 10am today (16:00-10:00 PKT)
      const morningRunEmails = processedEmails.filter(email => {
        const receivedDate = new Date(email.receivedDateTime);
        const receivedPKT = new Date(receivedDate.getTime() + 5 * 60 * 60 * 1000);
        const hourPKT = receivedPKT.getUTCHours();
        // 16:00 PKT to 23:59 PKT (yesterday) OR 00:00 PKT to 10:00 PKT (today)
        return hourPKT >= 16 || hourPKT < 10;
      });
      
      // Evening run should cover: 10am to 4pm today (10:00-16:00 PKT)
      const eveningRunEmails = processedEmails.filter(email => {
        const receivedDate = new Date(email.receivedDateTime);
        const receivedPKT = new Date(receivedDate.getTime() + 5 * 60 * 60 * 1000);
        const hourPKT = receivedPKT.getUTCHours();
        return hourPKT >= 10 && hourPKT < 16;
      });
      
      console.log(`Morning Run (4pm PKT yesterday → 10am PKT today): ${morningRunEmails.length} emails`);
      console.log(`Evening Run (10am PKT → 4pm PKT today): ${eveningRunEmails.length} emails`);
      console.log(`Total: ${morningRunEmails.length + eveningRunEmails.length} emails`);
      console.log(`\n✅ Coverage: ${((morningRunEmails.length + eveningRunEmails.length) / processedEmails.length * 100).toFixed(1)}%`);

    } else {
      console.log("ℹ️ No emails found in the specified time range");
    }

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("API Error:", error.response.data);
    }
    console.error("Stack trace:", error.stack);
  }
};

// Run the test
testAllDayEmails();