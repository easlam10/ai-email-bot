import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_RECIPIENT_NUMBER = process.env.DEFAULT_RECIPIENT_NUMBER;

// Helper function to extract category counts from AI result
// Updated extractCategoryCounts
export const extractCategoryCounts = (aiResult) => {
  const { categories, meta } = aiResult;
  return {
    executionNumber: meta.executionNumber,
    date: meta.date,
    total: meta.total,
    hrCount: categories.HR.length,
    marketingCount: categories.Marketing.length,
    pnmCount: categories.PNM.length,
    auditCount: categories.Audit.length,
    accountsCount: categories.Accounts.length,
    dcrCount: categories.DCR, // Already a number
    othersCount: categories.Others.length,
  };
};

// Updated generateCategoryBreakdownMessage
export const generateCategoryBreakdownMessage = (aiResult) => {
  const { categories, meta } = aiResult;
  
  // Format emails with numbers and \r separators
  const formatEmails = (emails) => {
    if (!emails || emails.length === 0) return "None";
    return emails.map((email, index) => 
      `${index + 1}. ${email.replace(/;/g, ',')}`
    ).join('\r'); // Use \r instead of \n
  };

  return {
    executionNumber: meta.executionNumber,
    date: meta.date,
    HR: formatEmails(categories.HR),
    Marketing: formatEmails(categories.Marketing),
    PNM: formatEmails(categories.PNM),
    Audit: formatEmails(categories.Audit),
    Accounts: formatEmails(categories.Accounts),
    DCR: `${categories.DCR} emails`,
    Others: formatEmails(categories.Others),
  };
};

export async function sendWhatsAppCategorySummary(aiResult) {
  const url = `https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const counts = extractCategoryCounts(aiResult);

  console.log("📊 Extracted counts for summary:", counts);

  const payload = {
    messaging_product: "whatsapp",
    to: WHATSAPP_RECIPIENT_NUMBER,
    type: "template",
    template: {
      name: "email_updates_1",
      language: { code: "en_US" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: counts.executionNumber.toString() },
            { type: "text", text: counts.date },
            { type: "text", text: counts.total.toString() },
            { type: "text", text: counts.hrCount.toString() },
            { type: "text", text: counts.marketingCount.toString() },
            { type: "text", text: counts.pnmCount.toString() },
            { type: "text", text: counts.auditCount.toString() },
            { type: "text", text: counts.accountsCount.toString() },
            { type: "text", text: counts.dcrCount.toString() },
            { type: "text", text: counts.othersCount.toString() },
          ],
        },
      ],
    },
  };

  console.log("📤 Sending summary payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    console.log("✅ WhatsApp summary message sent successfully!");
    return response.data;
  } catch (error) {
    console.error(
      "❌ WhatsApp API error (summary):",
      error.response?.data || error.message
    );
    throw error;
  }
}

export async function sendWhatsAppCategoryBreakdown(aiResult) {
  const url = `https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const breakdown = generateCategoryBreakdownMessage(aiResult);

  console.log("📋 Generated breakdown for message:", breakdown);

  const payload = {
    messaging_product: "whatsapp",
    to: WHATSAPP_RECIPIENT_NUMBER,
    type: "template",
    template: {
      name: "email_updates_2",
      language: { code: "en_US" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: breakdown.executionNumber?.toString() || "" },
            { type: "text", text: breakdown.date || "" },
            { type: "text", text: breakdown.HR || "None" },
            { type: "text", text: breakdown.Marketing || "None" },
            { type: "text", text: breakdown.PNM || "None" },
            { type: "text", text: breakdown.Audit || "None" },
            { type: "text", text: breakdown.Accounts || "None" },
            { type: "text", text: breakdown.DCR || "None" },
            { type: "text", text: breakdown.Others || "None" },
          ],
        },
      ],
    },
  };

  console.log(
    "📤 Sending breakdown payload:",
    JSON.stringify(payload, null, 2)
  );

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    console.log("✅ WhatsApp category breakdown message sent successfully!");
    return response.data;
  } catch (error) {
    console.error(
      "❌ WhatsApp API error (category breakdown):",
      error.response?.data || error.message
    );
    throw error;
  }
}
