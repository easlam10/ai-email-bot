import { getExecutionNumber } from "./fetchEmails.js";

let cachedExecutionNumber;

const getCachedExecutionNumber = () => {
  if (!cachedExecutionNumber) {
    cachedExecutionNumber = getExecutionNumber();
  }
  return cachedExecutionNumber;
};

export const generateCategoryCountMessage = (aiResult) => {
  const { categories, total, date } = aiResult;
  const executionNumber = getCachedExecutionNumber();

  const emojiMap = {
    'HR': '💼',
    'Marketing': '📢',
    'PNM': '🔧',
    'Audit': '🔍',
    'Accounts': '💰',
    'DCR': '🏫',
    'Others': '📦'
  };

  let message = `  ${executionNumber}\n`;
  message += `📅 ${date}\n`;
  message += `📬 Total Emails: ${total}\n\n`;
  message += `*📂 Category Count*\n`;

  const nonEmptyCategories = Object.entries(categories).filter(([, emails]) => emails.length > 0);

  if (nonEmptyCategories.length === 0) {
    message += `No new emails today.`;
    return message.trim();
  }

  for (const [cat, emails] of nonEmptyCategories) {
    const emoji = emojiMap[cat] || '📌';
    message += `${emoji} *${cat}*: ${emails.length}\n`;
  }

  return message.trim();
};

export const generateCategoryBreakdownMessage = (aiResult) => {
  const { categories, total, date } = aiResult;
  const executionNumber = getCachedExecutionNumber();

  const emojiMap = {
    'HR': '💼',
    'Marketing': '📢',
    'PNM': '🔧',
    'Audit': '🔍',
    'Accounts': '💰',
    'DCR': '🏫',
    'Others': '📦'
  };

  let message = ` ${executionNumber} \n`;
  message += `📅 ${date}\n`;
  message += `📊 Total: ${total} email${total !== 1 ? 's' : ''}\n`;

  const nonEmptyCategories = Object.entries(categories).filter(([, emails]) => emails.length > 0);

  if (nonEmptyCategories.length === 0) {
    return `${message}\nNo new emails to show.`;
  }

  message += `\n*🔍 CATEGORY BREAKDOWN*\n`;

  for (const [cat, emails] of nonEmptyCategories) {
    // Correctly skip breakdown for DCR using full key match
    if (cat.includes('DCR')) {
      const emoji = emojiMap['DCR'];
      message += `\n${emoji} *DCR* (${emails.length})\n`;
      continue;
    }

    // Extract category name from emoji-labeled key (e.g., "💼 HR" -> "HR")
    const cleanCat = Object.keys(emojiMap).find(key => cat.includes(key)) || cat;
    const emoji = emojiMap[cleanCat] || '📌';

    message += `\n${emoji} *${cleanCat}* (${emails.length})\n`;

    const senderGroups = {};

    for (const email of emails) {
      const name = email.from?.name || 'Unknown';
      const emailAddr = email.from?.email || 'no-email';
      const showEmail = name.toLowerCase() !== emailAddr.toLowerCase();
      const senderDisplay = showEmail ? `${name} (${emailAddr})` : name;

      if (!senderGroups[senderDisplay]) senderGroups[senderDisplay] = [];
      senderGroups[senderDisplay].push(email.subject || "No subject");
    }

    for (const [sender, subjects] of Object.entries(senderGroups)) {
      message += `*${sender}*\n`;
      for (const subject of subjects) {
        message += `   └ ${subject}\n`;
      }
    }
  }

  return message.trim();
};


