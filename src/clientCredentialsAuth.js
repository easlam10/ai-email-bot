// clientCredentialsAuth.js
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const TENANT = "kips.edu.pk"; // Specific tenant for the organization
const EMAIL_ADDRESSES = ["ce@kips.edu.pk", "pso.md@kips.edu.pk"]; // Target email addresses for API calls

// Get access token - either from database or generate new one
export const getAccessToken = async () => {
  try {
    return await getClientCredentialsToken();
  } catch (error) {
    console.error("Error getting access token:", error);
    throw error;
  }
};

// Get a new token using client credentials flow
const getClientCredentialsToken = async () => {
  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });

  try {
    console.log("Requesting new token from Microsoft Graph API...");
    const response = await axios.post(
      `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
      params,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { access_token, expires_in } = response.data;

    console.log(`✅ New token obtained, will expire in ${expires_in} seconds`);
    return access_token;
  } catch (error) {
    console.error("❌ Failed to obtain token:");
    console.error(error.response?.data || error.message);
    throw error;
  }
};

// Create a simple main function
const main = async () => {
  try {
    console.log("Starting token generation process...");
    const token = await getClientCredentialsToken();
    console.log("✅ Token successfully generated and saved to database");
    return true;
  } catch (error) {
    console.error("❌ Error during token generation:", error);
    throw error;
  }
};

// Execute main function directly when this file is run as a script
if (process.argv[1] && process.argv[1].endsWith("clientCredentialsAuth.js")) {
  main()
    .then(() => {
      console.log("Token generation completed successfully");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Failed to generate token:", err);
      process.exit(1);
    });
}

export { EMAIL_ADDRESSES, getClientCredentialsToken };
