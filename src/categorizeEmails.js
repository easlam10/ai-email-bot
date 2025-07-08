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
    "💼 HR": [ { "from": {...}, "subject": "...", "content": "..." }, ... ],
    "📢 Marketing": [...],
    "🔧 PNM": [...],
    "🔍 Audit": [...],
    "💰 Accounts": [...],
    "🏫 DCR": [...],
    "📦 Others": [...]
  },
  "total": X,
  "date": "YYYY-MM-DD"
}

Now categorize and format the following emails:
${JSON.stringify(emailData)}
`;



    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const jsonStr = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const data = JSON.parse(jsonStr);

    // Force correct total count
    data.total = emailData.length;
    data.date = new Date().toLocaleDateString("en-CA");

    return data;
  } catch (err) {
    console.error("❌ Email categorization failed:", err);
    throw new Error(`Email processing failed: ${err.message}`);
  }
};



