import dotenv from 'dotenv';
dotenv.config();

export const config = {
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  TWILIO_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER,
  WHATSAPP_TO: process.env.RECIPIENT_WHATSAPP_NUMBER,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
};
