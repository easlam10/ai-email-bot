import dotenv from "dotenv";
import axios from "axios";

dotenv.config({ path: "../.env" });

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_RECIPIENT_NUMBER = process.env.WHATSAPP_RECIPIENT_NUMBER;

export async function sendWhatsAppCategorySummary(counts) {
  const url = `https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: WHATSAPP_RECIPIENT_NUMBER,
    type: "template",
    template: {
      name: "email_updates",
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
            { type: "text", text: counts.dcrCount.toString() },
            { type: "text", text: counts.othersCount.toString() },
          ],
        },
      ],
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    console.log("✅ WhatsApp message sent:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ WhatsApp API error:",
      error.response?.data || error.message
    );
    throw error;
  }
}

export async function sendWhatsAppCategoryBreakdown(breakdown) {
  const url = `https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: WHATSAPP_RECIPIENT_NUMBER,
    type: "template",
    template: {
      name: "email_category_breakdown", // Make sure this matches your Meta Suite template name
      language: { code: "en_US" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: breakdown.executionNumber?.toString() || "" }, // {{1}}
            { type: "text", text: breakdown.date || "" }, // {{2}}
            { type: "text", text: breakdown.HR || "None" }, // {{3}}
            { type: "text", text: breakdown.Marketing || "None" }, // {{4}}
            { type: "text", text: breakdown.PNM || "None" }, // {{5}}
            { type: "text", text: breakdown.Audit || "None" }, // {{6}}
            { type: "text", text: breakdown.DCR || "None" }, // {{7}}
            { type: "text", text: breakdown.Others || "None" }, // {{8}}
          ],
        },
      ],
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    console.log("✅ WhatsApp category breakdown message sent:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ WhatsApp API error (category breakdown):",
      error.response?.data || error.message
    );
    throw error;
  }
}
