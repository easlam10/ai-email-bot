import express from "express";
import axios from "axios";
import open from "open";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = 3000;

// Special configuration for Outlook.com personal accounts
const OUTLOOK_SCOPES = [
  "openid",
  "profile",
  "offline_access",
  "https://outlook.office.com/mail.read", // Critical scope for Outlook REST API
];

const OUTLOOK_AUTH_URL =
  `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
  `client_id=${process.env.CLIENT_ID}` +
  `&response_type=code` +
  `&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}` +
  `&scope=${encodeURIComponent(OUTLOOK_SCOPES.join(" "))}` +
  `&prompt=select_account`; // Forces account selection

app.get("/", (req, res) => {
  open(OUTLOOK_AUTH_URL);
  res.send(`
        <h1>Outlook.com Authentication</h1>
        <p>Redirecting to Microsoft login...</p>
        <p>If not redirected automatically, <a href="${OUTLOOK_AUTH_URL}">click here</a>.</p>
    `);
});

app.get("/auth/callback", async (req, res) => {
  const { code, error: authError } = req.query;

  if (authError) {
    console.error("Auth error:", authError);
    return res.status(400).send(`
            <h1>Authentication Failed</h1>
            <p>Error: ${authError}</p>
            <p>${req.query.error_description || ""}</p>
        `);
  }

  try {
    // 1. Exchange code for tokens
    const tokenResponse = await axios.post(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
        redirect_uri: process.env.REDIRECT_URI,
        grant_type: "authorization_code",
        scope: OUTLOOK_SCOPES.join(" "),
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;
    console.log("Token exchange successful");

    // 2. Get user's actual email address
    const userInfo = await axios
      .get("https://outlook.office.com/api/v2.0/me", {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "X-AnchorMailbox": "user@outlook.com", // Temporary placeholder
        },
      })
      .catch((err) => {
        console.warn("Could not fetch user info directly, using fallback");
        return { data: { EmailAddress: process.env.TEST_EMAIL } };
      });

    const userEmail = userInfo.data.EmailAddress || userInfo.data.Email;
    console.log("Authenticated as:", userEmail);

    // 3. Fetch emails with proper mailbox anchoring
    const mailResponse = await axios.get(
      "https://outlook.office.com/api/v2.0/me/messages?$top=5&$select=Subject,From,ReceivedDateTime",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "X-AnchorMailbox": userEmail, // Dynamic anchoring
          "X-PreferServerAffinity": "true", // Improves reliability
        },
      }
    );

    // Display results
    const emails = mailResponse.data.value.map((mail) => ({
      subject: mail.Subject,
      from: mail.From?.EmailAddress?.Name || mail.From?.EmailAddress?.Address,
      date: new Date(mail.ReceivedDateTime).toLocaleString(),
    }));

    res.send(`
            <h1>Outlook.com Emails (${emails.length})</h1>
            <ul style="font-family: Arial; list-style: none; padding: 0;">
                ${emails
                  .map(
                    (email) => `
                    <li style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                        <strong style="font-size: 1.2em;">${
                          email.subject || "No subject"
                        }</strong><br>
                        <span style="color: #666;">From: ${
                          email.from
                        }</span><br>
                        <small>${email.date}</small>
                    </li>
                `
                  )
                  .join("")}
            </ul>
            <div style="margin-top: 30px; color: green;">
                Authentication and API access successful!
            </div>
        `);
  } catch (error) {
    console.error("Full error:", {
      status: error.response?.status,
      headers: error.response?.headers,
      data: error.response?.data,
      config: error.config,
    });

    res.status(500).send(`
            <h1 style="color: red;">Error Occurred</h1>
            <h2>${error.response?.status || "No status"} - ${
      error.response?.statusText || "Unknown error"
    }</h2>
            <pre style="white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 5px;">
${JSON.stringify(error.response?.data || error.message, null, 2)}
            </pre>
            <p>Check your console for full debugging details.</p>
        `);
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server ready at http://localhost:${PORT}`);
  console.log("Configuration:");
  console.log("- Client ID:", process.env.CLIENT_ID);
  console.log("- Redirect URI:", process.env.REDIRECT_URI);
  console.log("- Scopes:", OUTLOOK_SCOPES.join(", "));
});
