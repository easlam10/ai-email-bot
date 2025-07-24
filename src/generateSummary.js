import { getExecutionNumber } from "./fetchEmails.js";

// Add a declaration for the cache variable
let cachedExecutionNumber = null;

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

// Helper function to clean subject lines
const cleanSubject = (subject) => {
  if (!subject) return "No subject";
  // Remove 'Re:', 'Fwd:', etc. from the beginning of the subject
  return subject.replace(/^(Re|Fw|Fwd|Forward):\s*/i, "").trim();
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
    const emailCount = emails.length;

    // For DCR category, only show the count
    if (label === "DCR") {
      breakdown[label] = `${label} (${emailCount})`;
      continue;
    }

    // For empty categories, just show the count
    if (emailCount === 0) {
      breakdown[label] = `${label} (${emailCount})`;
      continue;
    }

    // For categories with emails, show count and formatted emails
    const categoryHeader = `${label} (${emailCount})`;

    const formatted = emails
      .map((email) => {
        const emailAddr = email.from?.email || "no-email";
        const subject = cleanSubject(email.subject || "No subject");
        return `${emailAddr} - ${subject}`;
      })
      .join("\n");

    breakdown[label] = `${categoryHeader}\n${formatted}`;
  }

  return breakdown;
};
