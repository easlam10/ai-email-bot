// fetchEmails.js
import axios from "axios";
import dotenv from "dotenv";
import { extractTextFromHtml } from "./extractText.js";
import { connectToDatabase, getExecutionTracker } from "./database/models.js";
import { getAccessToken } from "./clientCredentialsAuth.js";

dotenv.config();

// Helper function to get time ranges based on execution time
const getTimeRangeForExecution = (executionNumber) => {
  const now = new Date();

  // PKT is UTC+5, so we get PKT hour by adding 5 hours to UTC
  const currentUTCHour = now.getUTCHours();
  const currentPKTHour = (currentUTCHour + 5) % 24;
  const currentPKTMinute = now.getUTCMinutes();

  console.log(`🔍 Time detection debug:`);
  console.log(`   Current UTC time: ${now.toISOString()}`);
  console.log(`   Current UTC hour: ${currentUTCHour}`);
  console.log(
    `   Current PKT hour: ${currentPKTHour}:${currentPKTMinute
      .toString()
      .padStart(2, "0")}`
  );

  // Determine run type with tighter windows
  // Morning run: 9:00am-11:59am PKT (2-hour window around 10am)
  // Evening run: 3:00pm-5:59pm PKT (2-hour window around 4pm)
  // Fallback: Use proximity to decide

  let isMorningRun;
  let runType;

  if (currentPKTHour >= 9 && currentPKTHour < 12) {
    // 9am-11:59am PKT - Morning window
    isMorningRun = true;
    runType = "SCHEDULED_MORNING";
  } else if (currentPKTHour >= 15 && currentPKTHour < 18) {
    // 3pm-5:59pm PKT - Evening window
    isMorningRun = false;
    runType = "SCHEDULED_EVENING";
  } else {
    // Outside scheduled windows - determine by proximity
    console.log(`   ⚠️  WARNING: Running outside scheduled windows!`);

    // Calculate distance to 10am and 4pm
    const distanceTo10am = Math.abs(currentPKTHour - 10);
    const distanceTo4pm = Math.abs(currentPKTHour - 16);

    if (distanceTo10am < distanceTo4pm) {
      isMorningRun = true;
      runType = "MANUAL_MORNING";
      console.log(`   📍 Closer to 10am PKT - using MORNING logic`);
    } else {
      isMorningRun = false;
      runType = "MANUAL_EVENING";
      console.log(`   📍 Closer to 4pm PKT - using EVENING logic`);
    }
  }

  console.log(`   Run type: ${runType}`);
  console.log(`   Is morning run: ${isMorningRun}`);

  let startTime, endTime;

  if (isMorningRun) {
    // 10am PKT run: Get emails from 4pm PKT yesterday to 10am PKT today
    // 4pm PKT = 11am UTC (previous day)
    // 10am PKT = 5am UTC (current day)

    const todayUTC = new Date(now);
    todayUTC.setUTCHours(5, 0, 0, 0); // 10am PKT = 5am UTC today

    const yesterdayUTC = new Date(todayUTC);
    yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);
    yesterdayUTC.setUTCHours(11, 0, 0, 0); // 4pm PKT = 11am UTC yesterday

    startTime = yesterdayUTC;
    endTime = todayUTC;
  } else {
    // 4pm PKT run: Get emails from 10am PKT to 4pm PKT today
    // 10am PKT = 5am UTC
    // 4pm PKT = 11am UTC

    const todayUTC = new Date(now);
    const startOfPeriod = new Date(todayUTC);
    startOfPeriod.setUTCHours(5, 0, 0, 0); // 10am PKT = 5am UTC

    const endOfPeriod = new Date(todayUTC);
    endOfPeriod.setUTCHours(11, 0, 0, 0); // 4pm PKT = 11am UTC

    startTime = startOfPeriod;
    endTime = endOfPeriod;
  }

  const timeRange = isMorningRun
    ? "4pm_previous_day_to_10am_current_day"
    : "10am_to_4pm_current_day";

  console.log(`   Expected time range: ${timeRange}`);
  console.log(`   Start time (UTC): ${startTime.toISOString()}`);
  console.log(`   End time (UTC): ${endTime.toISOString()}`);

  // Convert to PKT for logging
  const startPKT = new Date(startTime.getTime() + 5 * 60 * 60 * 1000);
  const endPKT = new Date(endTime.getTime() + 5 * 60 * 60 * 1000);
  console.log(
    `   Start time (PKT): ${startPKT
      .toISOString()
      .replace("T", " ")
      .slice(0, 19)} PKT`
  );
  console.log(
    `   End time (PKT): ${endPKT
      .toISOString()
      .replace("T", " ")
      .slice(0, 19)} PKT`
  );

  return {
    start: startTime,
    end: endTime,
    isMorningRun,
    timeRange,
    runType,
  };
};

export const fetchEmails = async (emailAddress, executionNumber = 1) => {
  try {
    const accessToken = await getAccessToken();

    // Get time range based on execution time
    const timeRange = getTimeRangeForExecution(executionNumber);
    const startISO = timeRange.start.toISOString();
    const endISO = timeRange.end.toISOString();

    console.log(
      `Fetching emails for ${emailAddress} from ${startISO} to ${endISO} (${timeRange.timeRange})...`
    );

    // Build filter for time range
    const timeFilter = `receivedDateTime ge ${startISO} and receivedDateTime le ${endISO}`;

    const mailResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${emailAddress}/messages?$filter=${timeFilter}&$select=id,subject,from,receivedDateTime,body,webLink&$top=150&$orderby=receivedDateTime desc`,
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
          receivedDateTime: mail.receivedDateTime,
          date: new Date(mail.receivedDateTime).toLocaleString(),
          body: latestReply,
          webLink: mail.webLink || null,
        };
      })
    );

    console.log(
      `✅ Processed ${allEmails.length} emails from API (no database storage needed)`
    );
    return allEmails;
  } catch (error) {
    console.error("Error fetching emails:", error);
    throw error;
  }
};
