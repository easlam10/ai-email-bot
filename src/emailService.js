import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Helper function to extract category counts from AI result
export const extractCategoryCounts = (aiResult) => {
  const { categories, meta } = aiResult;
  return {
    executionNumber: meta.executionNumber,
    date: meta.date,
    total: meta.total,
    hrCount: Array.isArray(categories.HR) ? categories.HR.length : 0,
    marketingCount: Array.isArray(categories.Marketing)
      ? categories.Marketing.length
      : 0,
    pnmCount: Array.isArray(categories.PNM) ? categories.PNM.length : 0,
    auditCount: Array.isArray(categories.Audit) ? categories.Audit.length : 0,
    accountsCount: Array.isArray(categories.Accounts)
      ? categories.Accounts.length
      : 0,
    dcrCount: Array.isArray(categories.DCR)
      ? categories.DCR.length
      : categories.DCR,
    othersCount: Array.isArray(categories.Others)
      ? categories.Others.length
      : 0,
  };
};

// Generate category breakdown message with email URLs
export const generateCategoryBreakdownMessage = (aiResult) => {
  const { categories, meta } = aiResult;

  const formatEmailsForDetails = (emails) => {
    if (!emails || emails.length === 0)
      return "<em>No emails in this category</em>";

    return emails
      .map((email, index) => {
        let emailText, originalWebLink;

        if (typeof email === "string") {
          emailText = email.replace(/;/g, ",");
          originalWebLink = "#";
        } else {
          emailText = (email.text || email).replace(/;/g, ",");
          originalWebLink = email.emailData?.originalWebLink || "#";
        }

        // Parse email text to separate sender and subject
        const parts = emailText.split(" - ");
        const sender = parts[0] || "";
        const subject = parts.slice(1).join(" - ") || "";

        return `
          <div style="padding: 12px; margin: 8px 0; border-left: 3px solid #0078d4; background-color: #fafafa; border-radius: 4px;">
            <div style="margin-bottom: 6px;">
              <span style="color: #666; font-size: 14px;">${index + 1}.</span>
              <strong style="color: #333; margin-left: 6px;">${sender}</strong>
            </div>
            <div style="color: #555; margin-bottom: 8px; font-size: 15px;">
              ${subject}
            </div>
            ${
              originalWebLink !== "#"
                ? `<div style="margin-top: 8px;">
              <a href="${originalWebLink}" target="_blank" style="color: #0078d4; text-decoration: none; font-weight: 500; padding: 4px 8px; background-color: #e3f2fd; border-radius: 3px; font-size: 13px;">🔗 Open Email</a>
            </div>`
                : ""
            }
          </div>`;
      })
      .join("");
  };

  return {
    executionNumber: meta.executionNumber,
    date: meta.date,
    HR: formatEmailsForDetails(categories.HR),
    Marketing: formatEmailsForDetails(categories.Marketing),
    PNM: formatEmailsForDetails(categories.PNM),
    Audit: formatEmailsForDetails(categories.Audit),
    Accounts: formatEmailsForDetails(categories.Accounts),
    DCR: formatEmailsForDetails(categories.DCR),
    Others: formatEmailsForDetails(categories.Others),
  };
};

// Create Gmail transporter
function createGmailTransporter() {
  // Email credentials from test-email.js
  const yourEmail = process.env.GOOGLE_SENDER_EMAIL;
  const appPassword = process.env.GOOGLE_APP_PASSWORD;

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: yourEmail,
      pass: appPassword,
    },
  });
}

// Send consolidated email report using Gmail
export async function sendConsolidatedEmailReport(aiResult) {
  try {
    const transporter = createGmailTransporter();
    // Email addresses from test-email.js
    const senderEmail = process.env.GOOGLE_SENDER_EMAIL;
    const recipientEmail = process.env.GOOGLE_RECIPIENT_EMAIL;
    const counts = extractCategoryCounts(aiResult);
    const breakdown = generateCategoryBreakdownMessage(aiResult);

    const categories = [
      {
        id: "hr",
        name: "HR",
        icon: "💼",
        count: counts.hrCount,
        content: breakdown.HR,
      },
      {
        id: "marketing",
        name: "Marketing",
        icon: "📢",
        count: counts.marketingCount,
        content: breakdown.Marketing,
      },
      {
        id: "pnm",
        name: "PNM",
        icon: "🔧",
        count: counts.pnmCount,
        content: breakdown.PNM,
      },
      {
        id: "audit",
        name: "Audit",
        icon: "🔍",
        count: counts.auditCount,
        content: breakdown.Audit,
      },
      {
        id: "accounts",
        name: "Accounts",
        icon: "💰",
        count: counts.accountsCount,
        content: breakdown.Accounts,
      },
      {
        id: "dcr",
        name: "DCR",
        icon: "🏫",
        count: counts.dcrCount,
        content: breakdown.DCR,
      },
      {
        id: "others",
        name: "Others",
        icon: "📦",
        count: counts.othersCount,
        content: breakdown.Others,
      },
    ];

    // Generate summary section at top
    let summarySection = "";
    categories.forEach((category) => {
      summarySection += `
        <tr>
          <td>
            <table width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="background-color: #f3f2f1; padding: 12px; border-left: 4px solid #0078d4;">
                  <strong>${category.icon} ${category.name}:</strong> ${
        category.count
      } email${category.count !== 1 ? "s" : ""}
                  ${
                    category.count > 0
                      ? `<span style="float: right;"><a href="#${category.id}" style="color: #0078d4; text-decoration: none;">▼ View Details</a></span>`
                      : ""
                  }
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td height="10"></td></tr>
      `;
    });

    // Generate detailed sections at bottom
    let detailSections = "";
    categories.forEach((category) => {
      if (category.count > 0) {
        detailSections += `
          <tr>
            <td>
              <a name="${category.id}"></a>
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background-color: #0078d4; color: white; padding: 15px;">
                    <strong style="font-size: 16px;">${category.icon} ${category.name} Details</strong>
                    <span style="float: right;"><a href="#top" style="color: white; text-decoration: none;">▲ Back to Top</a></span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px; border: 1px solid #e0e0e0; border-top: none; background-color: #fafafa;">
                    ${category.content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td height="30"></td></tr>
        `;
      }
    });

    const mailOptions = {
      from: senderEmail,
      to: recipientEmail,
      subject: `📊 Daily Email Report - ${counts.date} (${counts.total} emails)`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 20px;">
          <a name="top"></a>
          <table width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td>
                <h2 style="color: #0078d4; border-bottom: 2px solid #0078d4; padding-bottom: 10px;">📊 Daily Email Report - ${counts.date}</h2>
                <p><strong>Total Emails:</strong> ${counts.total}</p>
                <p><strong>DCR Report #${counts.executionNumber}</strong></p>
                
                <h3 style="color: #0078d4; margin-top: 30px; margin-bottom: 20px;">📈 Category Summary</h3>
              </td>
            </tr>
            
            <!-- Category Summary Section -->
            ${summarySection}
            
            <tr>
              <td>
                <hr style="margin: 40px 0; border: none; border-top: 2px solid #e0e0e0;">
                <h3 style="color: #0078d4;">📋 Detailed Email Lists</h3>
                <p style="color: #666; font-size: 14px;"><em>Click on category names above to jump to details, or scroll down to view all.</em></p>
              </td>
            </tr>
            
            <tr><td height="20"></td></tr>
            
            <!-- Detailed Sections -->
            ${detailSections}
            
            <tr>
              <td>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
                <p style="color: #666; font-size: 14px; text-align: center;">
                  <em>Generated by AI Email Bot • DCR Report #${counts.executionNumber}</em><br>
                  <em>💡 Click "View Details" to jump to emails in each category. Links will open emails in Outlook.</em>
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
📊 Daily Email Report - ${counts.date}

Total Emails Processed: ${counts.total}
DCR Report #${counts.executionNumber}

📈 Category Summary:
💼 HR: ${counts.hrCount} emails
📢 Marketing: ${counts.marketingCount} emails  
🔧 PNM: ${counts.pnmCount} emails
🔍 Audit: ${counts.auditCount} emails
💰 Accounts: ${counts.accountsCount} emails
🏫 DCR: ${counts.dcrCount} emails
📦 Others: ${counts.othersCount} emails

Generated by AI Email Bot • DCR Report #${counts.executionNumber}
      `,
    };

    console.log("📤 Sending consolidated email report via Gmail...");
    console.log(`📧 From: ${senderEmail}`);
    console.log(`📧 To: ${recipientEmail}`);

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Consolidated email report sent successfully!");
    console.log(`📬 Message ID: ${info.messageId}`);
    return { messageId: info.messageId, response: info.response };
  } catch (error) {
    console.error(
      "❌ Error sending consolidated email report:",
      error.response?.data || error.message
    );
    throw error;
  }
}
