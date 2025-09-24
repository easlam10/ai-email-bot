import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getEmailsForCategorization,
  markEmailsAsCategorized,
} from "./database/models.js";

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Simplified JSON structure for WhatsApp templates
const safeJsonParse = (jsonStr) => {
  try {
    // First try to parse directly
    return JSON.parse(jsonStr);
  } catch (firstError) {
    try {
      // Try cleaning common issues
      let cleaned = jsonStr
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      // Fix common formatting issues
      cleaned = cleaned
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
        .replace(/,\s*([}\]])/g, "$1")
        .replace(/'/g, '"') // Replace single quotes with double quotes
        .replace(/\n/g, " ") // Remove newlines that might break JSON
        .replace(/\r/g, " ") // Remove carriage returns
        .replace(/\t/g, " ") // Remove tabs
        .replace(/\s+/g, " "); // Normalize whitespace

      return JSON.parse(cleaned);
    } catch (secondError) {
      console.error("Original JSON error:", firstError);
      console.error("Cleaned JSON error:", secondError);
      console.error("Problematic JSON:", jsonStr);
      throw new Error(
        `Failed to parse JSON after cleaning: ${secondError.message}`
      );
    }
  }
};

export const categorizeEmails = async (executionNumber, sourceEmail = null) => {
  try {
    const emailData = await getEmailsForCategorization(sourceEmail);
    console.log(`Processing ${emailData.length} emails...`);

    const today = new Date().toLocaleDateString("en-CA");
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Simplified prompt with clearer instructions and simpler output format
    const prompt = `
You're categorizing emails into a simplified JSON format for WhatsApp templates. Follow these RULES STRICTLY:

1. CATEGORY DEFINITIONS (MUST FOLLOW):

💼 HR (Human Resources):
- Emails about: hiring, recruitment, employee benefits, payroll, leave requests
- Keywords: "recruitment", "hiring", "payroll", "benefits", "employee", "HR", "leave"
- Example: "Update on maternity leave policy"

📢 Marketing:
- Emails about: advertising, campaigns, social media, promotions, branding
- Keywords: "campaign", "advertisement", "social media", "promotion", "branding"
- Example: "New product launch campaign"

🔧 PNM (Procurement & Maintenance):
- Emails about: purchases, vendor management, equipment maintenance, repairs
- Keywords: "purchase order", "vendor", "maintenance", "repair", "procurement", "supply"
- Example: "Generator maintenance schedule"

🔍 Audit:
- Emails about: compliance, inspections, quality checks, internal audits
- Keywords: "audit", "compliance", "inspection", "quality check", "findings"
- Example: "Quarterly audit report"

💰 Accounts:
- Emails about: invoices, payments, financial reports, budgeting
- Keywords: "invoice", "payment", "financial report", "budget", "accounts"
- Example: "Invoice #12345 for services"

🏫 DCR (Daily Campus Report) - HIGHEST PRIORITY CATEGORY:
- MUST Categorize as DCR if subject contains ANY of these (case insensitive):
  * "DCR" (anywhere in subject)
  * "Daily Campus Report" (anywhere in subject)
  * "Daily College Report" (anywhere in subject)
  * "Daily Report" (if related to campus/college)
  * "Campus Report" (if daily)
- These override ALL other categories - DCR takes absolute priority
- Include sender email and subject details like other categories
- Examples that MUST be DCR:
  * "Daily Campus Report 07-08-2025"
  * "DCR 7-8-25"
  * "Daily Campus Report (Chauburji) 07-8-2025"
  * "DAILY CAMPUS REPORT OF BUREWALA CAMPUS 07-08-2025"
  * "Evening Coaching DCR Observations"
  * "EC DCR (SKT-DKR) 06-08-25"

📦 Others:
- Everything that doesn't fit above categories
- When in doubt, put here

2. FORMAT REQUIREMENTS:
- Include ONLY sender email and subject for each email
- Format: "sender@example.com - Subject line"
- For DCR: Include sender email and subject details like other categories
- Strict JSON format (no Markdown, no trailing commas)

3. OUTPUT FORMAT (MUST FOLLOW EXACTLY - USE INDEX NUMBERS):
{
  "categories": {
    "HR": [0, 5, 12],
    "Marketing": [1, 8, 15],
    "PNM": [2, 9, 16],
    "Audit": [3, 10],
    "Accounts": [4, 11, 17],
    "DCR": [6, 13, 18, 19],
    "Others": [7, 14, 20]
  }
}

IMPORTANT: Return ONLY index numbers (0, 1, 2, etc.) that correspond to the email positions in the provided array.

CRITICAL: DCR rules take ABSOLUTE PRIORITY over all other categories. If you see "Daily Campus Report" or "DCR" in the subject, it MUST go to DCR category.

Now categorize these emails by their INDEX numbers (DCR rules take absolute priority over all others):
${JSON.stringify(
  emailData.map((e, index) => ({
    index: index,
    from: e.from,
    subject: e.subject,
    body: e.body?.substring(0, 700) || "", // Include first 700 chars of body for better categorization
  }))
)}

Return the categories with INDEX NUMBERS instead of email strings:
{
  "categories": {
    "HR": [0, 5, 12],
    "Marketing": [1, 8],
    "DCR": [2, 15, 20],
    "Others": [3, 7]
  }
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON more carefully
    let jsonStr = text;
    try {
      // Try to find JSON in the response
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        jsonStr = text.slice(jsonStart, jsonEnd);
      }
    } catch (err) {
      console.error("JSON extraction error:", err);
    }

    const data = safeJsonParse(jsonStr);

    // Validate and normalize the response
    if (!data.categories) {
      throw new Error("Invalid response: missing categories");
    }

    // Ensure all categories exist as arrays
    const requiredCategories = [
      "HR",
      "Marketing",
      "PNM",
      "Audit",
      "Accounts",
      "DCR",
      "Others",
    ];
    for (const category of requiredCategories) {
      if (!data.categories[category]) {
        data.categories[category] = [];
      }
      // Ensure all categories are arrays
      if (!Array.isArray(data.categories[category])) {
        data.categories[category] = [];
      }
    }

    // Convert index numbers back to full email objects with webLinks
    for (let category in data.categories) {
      if (Array.isArray(data.categories[category])) {
        data.categories[category] = data.categories[category].map(
          (emailIndex) => {
            const email = emailData[emailIndex];
            if (email) {
              return {
                text: `${
                  email.from?.email || email.from?.name || "Unknown"
                } - ${email.subject || "No Subject"}`,
                emailData: {
                  originalWebLink: email.webLink || "#",
                  id: email.id,
                  subject: email.subject,
                  from: email.from,
                },
              };
            } else {
              console.warn(`Email at index ${emailIndex} not found`);
              return {
                text: `Unknown - Invalid Index ${emailIndex}`,
                emailData: {
                  originalWebLink: "#",
                },
              };
            }
          }
        );
      }
    }

    // Add meta information
    data.meta = {
      total: emailData.length,
      date: today,
      executionNumber,
      emailSource: sourceEmail || 'Unknown Email Source',
    };

    // Mark emails as categorized only after successful AI processing
    await markEmailsAsCategorized(emailData);

    console.log("✅ Successfully categorized emails and added webLinks");
    return data;
  } catch (err) {
    console.error("❌ Email categorization failed:", err);
    throw new Error(`Email processing failed: ${err.message}`);
  }
};
