import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getExecutionNumber } from "./fetchEmails.js";

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const categorizeEmails = async () => {
  try {
    const emailData = JSON.parse(fs.readFileSync("emails.json", "utf8"));
    console.log(`Processing ${emailData.length} emails...`);

    const executionNumber = getExecutionNumber(false); // Get and increment execution number
    console.log(`Using execution number: ${executionNumber}`);
    const today = new Date().toLocaleDateString("en-CA");

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
You're going to categorize emails and generate two WhatsApp messages: a summary and a breakdown.

The email categories are:
- 💼 HR: Human resources, employee-related matters
- 📢 Marketing: Marketing, advertising, communications
- 🔧 PNM: Maintenance, repairs, facility issues, lights, electric work, generators, UPS, walls
- 🔍 Audit: Audits, compliance, reviews
- 💰 Accounts: Finance, accounting, payments
- 🏫 DCR: Daily Campus Reports (include all emails with "DCR" in subject/content)
- 📦 Others: Everything else

INSTRUCTIONS:
1. Categorize the provided emails into these categories
2. Count how many emails are in each category
3. Create TWO separate messages as described below

MESSAGE 1 - SUMMARY:
Format exactly like this:
---
📊 Email Summary #${executionNumber} (${today}) 📊

Total Emails: [TOTAL COUNT]

💼 HR: [COUNT]
📢 Marketing: [COUNT]
🔧 PNM: [COUNT]
🔍 Audit: [COUNT]
🏫 DCR: [COUNT]
📦 Others: [COUNT]
---

MESSAGE 2 - BREAKDOWN:
Format exactly like this:
---
📋 Email Breakdown #${executionNumber} (${today}) 📋

HR ([COUNT])
[If count > 0, list each email as: "email@address - Subject" (remove "Re:" from subjects)]

Marketing ([COUNT])
[If count > 0, list each email as: "email@address - Subject" (remove "Re:" from subjects)]

PNM ([COUNT])
[If count > 0, list each email as: "email@address - Subject" (remove "Re:" from subjects)]

Audit ([COUNT])
[If count > 0, list each email as: "email@address - Subject" (remove "Re:" from subjects)]

DCR ([COUNT])
[For DCR category, ONLY show the count, DO NOT list any emails]

Others ([COUNT])
[If count > 0, list each email as: "email@address - Subject" (remove "Re:" from subjects)]
---

IMPORTANT NOTES:
1. For DCR category, only show "DCR ([COUNT])" with no breakdown of emails
2. For empty categories (count=0), show "CategoryName (0)" with no email list
3. Remove sender names from breakdown, only show email address and subject
4. Remove "Re:", "Fwd:", etc. from subject lines
5. For categories with emails, put count in parentheses next to category name
6. Separate email entries with line breaks

Output BOTH messages separated by a delimiter like "=====MESSAGE DIVIDER=====" 

Here are the emails to categorize:
${JSON.stringify(emailData)}
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the response to get both messages
    const messages = text.split(/=====MESSAGE DIVIDER=====|\n\n---\n\n/);

    let summaryMessage = "";
    let breakdownMessage = "";

    if (messages.length >= 2) {
      // Get the first message that looks like a summary (has "Email Summary" in it)
      for (const msg of messages) {
        if (msg.includes("Email Summary")) {
          summaryMessage = msg.trim();
          break;
        }
      }

      // Get the first message that looks like a breakdown (has "Email Breakdown" in it)
      for (const msg of messages) {
        if (msg.includes("Email Breakdown")) {
          breakdownMessage = msg.trim();
          break;
        }
      }
    }

    // If we couldn't find valid messages, generate fallback ones
    if (!summaryMessage || !breakdownMessage) {
      console.log(
        "⚠️ Could not parse AI response properly. Using fallback messages."
      );
      console.log("AI response was:", text);

      // Create fallback messages
      summaryMessage = `
📊 Email Summary #${executionNumber} (${today}) 📊

Total Emails: ${emailData.length}

💼 HR: 0
📢 Marketing: 0
🔧 PNM: 0
🔍 Audit: 0
🏫 DCR: 0
📦 Others: ${emailData.length}
      `.trim();

      breakdownMessage = `
📋 Email Breakdown #${executionNumber} (${today}) 📋

HR (0)

Marketing (0)

PNM (0)

Audit (0)

DCR (0)

Others (${emailData.length})
      `.trim();

      // If fallback messages, add at least some emails to the Others category in the breakdown
      if (emailData.length > 0) {
        breakdownMessage += "\n";
        const maxToShow = Math.min(emailData.length, 10); // Show up to 10 emails

        for (let i = 0; i < maxToShow; i++) {
          const email = emailData[i];
          const emailAddr = email.from?.email || "unknown@email.com";
          const subject = (email.subject || "No subject").replace(
            /^(Re|Fwd|Fw):\s*/i,
            ""
          );
          breakdownMessage += `${emailAddr} - ${subject}\n`;
        }

        if (maxToShow < emailData.length) {
          breakdownMessage += `... and ${emailData.length - maxToShow} more`;
        }
      }
    }

    console.log("✅ Successfully generated messages");

    // Return both messages
    return {
      summaryMessage,
      breakdownMessage,
      date: today,
      executionNumber,
      total: emailData.length,
    };
  } catch (err) {
    console.error("❌ Email categorization failed:", err);
    throw new Error(`Email processing failed: ${err.message}`);
  }
};
