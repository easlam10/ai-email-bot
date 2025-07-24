# AI Email Bot

Automated email processing with AI categorization and WhatsApp notifications.

## Features

- Fetches emails from Gmail
- Uses Google Gemini AI to categorize emails
- Sends summary and breakdown via WhatsApp
- Runs daily via GitHub Actions

## Setup

### GitHub Actions Setup

The bot is configured to run daily using GitHub Actions. Here's how to set it up:

1. **Configure Repository Secrets**

   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `GEMINI_API_KEY`: Your Google Gemini API key
     - `DEFAULT_RECIPIENT_NUMBER`: WhatsApp number to receive notifications
     - Add any other secrets needed for Gmail authentication

2. **Initial WhatsApp Authentication**

   - For the first run, you'll need to authenticate WhatsApp:
     - Manually trigger the workflow from the Actions tab
     - Wait for the workflow to generate a QR code
     - Download the QR code artifact from the workflow run
     - Scan it with WhatsApp on your phone
     - The session will be saved to MongoDB for future runs

3. **Schedule Customization**
   - To change the schedule, modify the cron expression in `.github/workflows/daily-email-report.yml`
   - Default schedule is 6 AM UTC daily: `0 6 * * *`

## Local Development

1. Install dependencies:

   ```
   npm install
   ```

2. Create a `.env` file with required variables:

   ```
   GEMINI_API_KEY=your_gemini_api_key
   MONGODB_URI=mongodb://localhost:27017/whatsapp-sessions
   DEFAULT_RECIPIENT_NUMBER=your_whatsapp_number
   ```

3. Run locally:
   ```
   npm start
   ```

## Troubleshooting

- **WhatsApp Authentication Issues**: Check MongoDB data in GitHub Action artifacts
- **Missing Emails**: Verify Gmail API credentials and access
- **Categorization Problems**: Test prompt adjustments in src/categorizeEmails.js
