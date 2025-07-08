// TEMPORARILY COMMENTING OUT THE EMAIL REPORT LOGIC
import { fetchEmails } from "./fetchEmails.js";
import { categorizeEmails } from "./categorizeEmails.js";
import { generateCategoryCountMessage, generateCategoryBreakdownMessage}  from "./generateSummary.js";
import { sendWhatsAppWithTemplate } from "./whatsappService.js";

export const generateDailyReport = async () => {
  try {
    await fetchEmails();
    const categorized = await categorizeEmails();
    const categoryCountMessage = generateCategoryCountMessage(categorized);
    const categoryBreakdownMessage = generateCategoryBreakdownMessage(categorized);

    console.log(categoryCountMessage);
    console.log(categoryBreakdownMessage);

    await sendWhatsAppWithTemplate(categoryCountMessage);
    await sendWhatsAppWithTemplate(categoryBreakdownMessage);
  } catch (error) {
    console.error("Report generation failed:", error);
    throw error;
  }
};

generateDailyReport();



