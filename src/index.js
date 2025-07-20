// index.js

import { fetchEmails } from "./fetchEmails.js";
import { categorizeEmails } from "./categorizeEmails.js";
import {
  extractCategoryCounts,
  generateCategoryBreakdownMessage,
} from "./generateSummary.js";
import {
  sendWhatsAppCategorySummary,
  sendWhatsAppCategoryBreakdown,
} from "./whatsappService.js";

export const generateDailyReport = async () => {
  try {
    // 1️⃣ Fetch emails and save locally
    await fetchEmails();

    // 2️⃣ Categorize emails using Gemini
    const categorized = await categorizeEmails();

    // 3️⃣ Extract clean counts for WhatsApp template
    const counts = extractCategoryCounts(categorized);

    // 4️⃣ Send first WhatsApp message (category count summary)
    await sendWhatsAppCategorySummary(counts);

    // 5️⃣ Generate and send category breakdown message
    const breakdown = generateCategoryBreakdownMessage(categorized);
    await sendWhatsAppCategoryBreakdown(breakdown);

    console.log("✅ Daily category count message sent successfully.");
  } catch (error) {
    console.error("❌ Report generation failed:", error);
    throw error;
  }
};

generateDailyReport();
