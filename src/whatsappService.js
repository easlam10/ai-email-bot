import dotenv from "dotenv";
import axios from "axios";

dotenv.config({ path: "../.env" });

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_RECIPIENT_NUMBER = process.env.WHATSAPP_RECIPIENT_NUMBER;

export async function sendWhatsAppWithTemplate(messageText) {
  try {
    const url = `https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: WHATSAPP_RECIPIENT_NUMBER,
      type: "template",
      template: {
        name: "email_alerts",
        language: { code: "en_US" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: messageText }],
          },
        ],
      },
    };

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
