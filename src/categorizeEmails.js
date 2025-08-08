import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEmailsForCategorization } from "./database/models.js";

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

export const categorizeEmails = async (executionNumber) => {
  try {
    const emailData = await getEmailsForCategorization();
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
- Only count needed (no details)
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
- For DCR: Only count is needed (no details)
- Strict JSON format (no Markdown, no trailing commas)

3. OUTPUT FORMAT (MUST FOLLOW EXACTLY):
{
  "categories": {
    "HR": ["hr@company.com - Updated vacation policy"],
    "Marketing": ["marketing@company.com - New campaign launch"],
    "PNM": ["procurement@company.com - New printer purchase"],
    "Audit": ["audit@company.com - Quarterly audit report"],
    "Accounts": ["accounts@company.com - Invoice #12345"],
    "DCR": 5,
    "Others": ["other@company.com - General inquiry"]
  },
  "meta": {
    "total": ${emailData.length},
    "date": "${today}",
    "executionNumber": ${executionNumber}
  }
}

CRITICAL: DCR rules take ABSOLUTE PRIORITY over all other categories. If you see "Daily Campus Report" or "DCR" in the subject, it MUST go to DCR category.

Now categorize these emails (DCR rules take absolute priority over all others):
${JSON.stringify(
  emailData.map((e) => ({
    from: e.from,
    subject: e.subject,
  }))
)}`;

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

    // Ensure all categories exist and DCR is a number
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
        if (category === "DCR") {
          data.categories[category] = 0;
        } else {
          data.categories[category] = [];
        }
      }
    }

    // Convert DCR to number if it's an array
    if (Array.isArray(data.categories.DCR)) {
      data.categories.DCR = data.categories.DCR.length;
    }

    // Validate that all categories are arrays (except DCR which should be a number)
    for (const category of requiredCategories) {
      if (category === "DCR") {
        if (typeof data.categories[category] !== "number") {
          data.categories[category] = 0;
        }
      } else {
        if (!Array.isArray(data.categories[category])) {
          data.categories[category] = [];
        }
      }
    }

    // Add meta information
    data.meta = {
      total: emailData.length,
      date: today,
      executionNumber,
    };

    console.log("✅ Successfully categorized emails");
    return data;
  } catch (err) {
    console.error("❌ Email categorization failed:", err);
    throw new Error(`Email processing failed: ${err.message}`);
  }
};
