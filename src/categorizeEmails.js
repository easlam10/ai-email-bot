import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const categorizeEmails = async () => {
  try {
    const emailData = JSON.parse(fs.readFileSync("emails.json", "utf8"));
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
You're summarizing emails into strict WhatsApp-ready JSON format.
Categorize the emails as follows:

1. Use these categories **with emojis in the key**:
   - "💼 HR"
   - "📢 Marketing"
   - "🔧 PNM"
   - "🔍 Audit"
   - "💰 Accounts"
   - "🏫 DCR"
   - "📦 Others" (for everything else)

2. For each email include:
   {
     "from": { "name": "...", "email": "..." },
     "subject": "[subject of the email]",
     "content": "[full content or summary of the email]"
   }

3. For DCR emails:
   - Include them in "🏫 DCR" category
   - We only need the count; no detailed breakdown shown in UI

4. Output JSON format must be EXACTLY:
{
  "categories": {
    "💼 HR": [ { "from": {"name": "Name", "email": "email@example.com"}, "subject": "Subject", "content": "Content" } ],
    "📢 Marketing": [],
    "🔧 PNM": [],
    "🔍 Audit": [],
    "💰 Accounts": [],
    "🏫 DCR": [],
    "📦 Others": []
  },
  "total": 0,
  "date": "2023-07-21"
}

IMPORTANT: Your response must be ONLY the valid JSON object, nothing else.

Now categorize and format the following emails:
${JSON.stringify(emailData)}
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Debug the raw response
    console.log("Raw API response (first 100 chars):", text.substring(0, 100));

    // Try different methods to extract valid JSON
    let data;
    let error = null;

    try {
      // Method 1: First try to parse the entire text directly
      data = JSON.parse(text);
      console.log("✅ Method 1 (direct parsing) successful");
    } catch (err1) {
      error = err1;
      try {
        // Method 2: Try to extract JSON between braces
        const potentialJsonStart = text.indexOf("{");
        const potentialJsonEnd = text.lastIndexOf("}") + 1;

        if (potentialJsonStart >= 0 && potentialJsonEnd > potentialJsonStart) {
          let jsonStr = text.substring(potentialJsonStart, potentialJsonEnd);

          // Basic sanitization
          jsonStr = jsonStr
            .replace(/\n/g, " ")
            .replace(/\t/g, " ")
            .replace(/\r/g, "");

          data = JSON.parse(jsonStr);
          console.log(
            "✅ Method 2 (extraction with basic sanitization) successful"
          );
        } else {
          throw new Error("Could not find valid JSON structure");
        }
      } catch (err2) {
        error = err2;
        try {
          // Method 3: Use regex to find code blocks that might contain JSON
          const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
          const match = text.match(codeBlockRegex);

          if (match && match[1]) {
            data = JSON.parse(match[1].trim());
            console.log("✅ Method 3 (code block extraction) successful");
          } else {
            throw new Error("No code blocks found containing JSON");
          }
        } catch (err3) {
          error = err3;
          // If all methods fail, create a fallback structure
          console.error("❌ All JSON parsing methods failed:", error.message);
          console.error("Raw response:", text);

          // Create default structure
          data = {
            categories: {
              "💼 HR": [],
              "📢 Marketing": [],
              "🔧 PNM": [],
              "🔍 Audit": [],
              "💰 Accounts": [],
              "🏫 DCR": [],
              "📦 Others": [],
            },
            total: emailData.length,
            date: new Date().toLocaleDateString("en-CA"),
          };

          // Attempt to categorize emails with a simple approach
          emailData.forEach((email) => {
            data.categories["📦 Others"].push({
              from: email.from || {
                name: "Unknown",
                email: "unknown@example.com",
              },
              subject: email.subject || "No subject",
              content: "Email content unavailable due to processing error",
            });
          });

          console.log(
            "⚠️ Using fallback categorization due to parsing failure"
          );
        }
      }
    }

    // Ensure required structure exists
    if (!data.categories) {
      data.categories = {
        "💼 HR": [],
        "📢 Marketing": [],
        "🔧 PNM": [],
        "🔍 Audit": [],
        "💰 Accounts": [],
        "🏫 DCR": [],
        "📦 Others": [],
      };
    }

    // Force correct total count and date
    data.total = emailData.length;
    data.date = new Date().toLocaleDateString("en-CA");

    return data;
  } catch (err) {
    console.error("❌ Email categorization failed:", err);
    throw new Error(`Email processing failed: ${err.message}`);
  }
};
