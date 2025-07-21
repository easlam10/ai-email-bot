import { getExecutionNumber } from "./fetchEmails.js";

let cachedExecutionNumber; // Declare the variable in module scope

const getCachedExecutionNumber = () => {
  if (!cachedExecutionNumber) {
    cachedExecutionNumber = getExecutionNumber();
  }
  return cachedExecutionNumber;
};

export const extractCategoryCounts = (aiResult) => {
  const { categories, total, date } = aiResult;
  const executionNumber = getExecutionNumber();

  return {
    executionNumber,
    date,
    total,
    hrCount: categories["💼 HR"].length,
    marketingCount: categories["📢 Marketing"].length,
    pnmCount: categories["🔧 PNM"].length,
    auditCount: categories["🔍 Audit"].length,
    dcrCount: categories["🏫 DCR"].length,
    othersCount: categories["📦 Others"].length,
  };
};

export const generateCategoryBreakdownMessage = (aiResult) => {
  const { categories, date } = aiResult;
  const executionNumber = getCachedExecutionNumber();

  // List of categories in the order for the template
  const categoryKeys = [
    { key: "💼 HR", label: "HR" },
    { key: "📢 Marketing", label: "Marketing" },
    { key: "🔧 PNM", label: "PNM" },
    { key: "🔍 Audit", label: "Audit" },
    { key: "🏫 DCR", label: "DCR" },
    { key: "📦 Others", label: "Others" },
  ];

  const breakdown = {
    executionNumber,
    date,
  };

  for (const { key, label } of categoryKeys) {
    const emails = categories[key] || [];
    if (!emails.length) {
      breakdown[label] = "None";
      continue;
    }
    const formatted = emails
      .map((email) => {
        const name = email.from?.name || "Unknown";
        const emailAddr = email.from?.email || "no-email";
        const showEmail = name.toLowerCase() !== emailAddr.toLowerCase();
        const senderDisplay = showEmail ? `${name} (${emailAddr})` : name;
        const subject = email.subject || "No subject";
        return `${senderDisplay} - ${subject}`;
      })
      .join("; ");
    breakdown[label] = formatted;
  }

  return breakdown;
};
