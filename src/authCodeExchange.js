// authCodeExchange.js
import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const AUTH_CODE = process.argv[2]; // Get code from CLI arg
const TOKEN_FILE = path.resolve("token.json");

const requestToken = async (code) => {
  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    code,
    redirect_uri: process.env.REDIRECT_URI,
    grant_type: "authorization_code",
    scope: "offline_access Mail.Read",
  });

  try {
    const response = await axios.post(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      params,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { refresh_token, access_token, expires_in } = response.data;

    fs.writeFileSync(
      TOKEN_FILE,
      JSON.stringify({ refresh_token }, null, 2)
    );

    console.log("✅ Token saved to token.json");
  } catch (error) {
    console.error("❌ Failed to exchange code for token:");
    console.error(error.response?.data || error.message);
  }
};

if (!AUTH_CODE) {
  console.error("⚠️  Please pass the auth code as a command line argument.");
  process.exit(1);
}

requestToken(AUTH_CODE);
