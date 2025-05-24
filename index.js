import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();

const TOKEN_FILE = path.resolve("token.json");
const OUTPUT_FILE = path.resolve("emails.json");

const OUTLOOK_SCOPES = [
  "openid",
  "profile",
  "offline_access",
  "https://outlook.office.com/mail.read",
];

// === Refresh access token using saved refresh token ===
const refreshAccessToken = async (refreshToken) => {
  const response = await axios.post(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: OUTLOOK_SCOPES.join(" "),
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  return response.data;
};

// === Fetch emails ===
const fetchEmails = async (accessToken, userEmail) => {
  const mailResponse = await axios.get(
    "https://outlook.office.com/api/v2.0/me/messages?$top=11&$select=Subject,From,ReceivedDateTime",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-AnchorMailbox": userEmail,
        "X-PreferServerAffinity": "true",
      },
    }
  );

  return mailResponse.data.value.map((mail) => ({
    subject: mail.Subject,
    from: mail.From?.EmailAddress?.Name || mail.From?.EmailAddress?.Address,
    date: new Date(mail.ReceivedDateTime).toLocaleString(),
  }));
};

// === Main function ===
const main = async () => {
  if (!fs.existsSync(TOKEN_FILE)) {
    console.error("No refresh token found. Please run the web version first.");
    process.exit(1);
  }

  try {
    const { refresh_token } = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
    const tokenData = await refreshAccessToken(refresh_token);
    const accessToken = tokenData.access_token;

    // Optional: save updated refresh token
    fs.writeFileSync(TOKEN_FILE, JSON.stringify({ refresh_token: tokenData.refresh_token }, null, 2));

    const userInfo = await axios.get("https://outlook.office.com/api/v2.0/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userEmail = userInfo.data.EmailAddress || userInfo.data.Email;
    const emails = await fetchEmails(accessToken, userEmail);

    // Output
    console.log(`Fetched ${emails.length} emails for ${userEmail}`);
    emails.forEach((email, idx) => {
      console.log(`\n[${idx + 1}] ${email.subject || "No Subject"}`);
      console.log(`From: ${email.from}`);
      console.log(`Date: ${email.date}`);
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(emails, null, 2));
    console.log(`\n✅ Emails saved to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error("Failed to fetch emails:", err.response?.data || err.message);
    process.exit(1);
  }
};

main();
