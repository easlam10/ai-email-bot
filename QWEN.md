# AI Email Bot Project Documentation

## Project Overview

This is a Node.js application that acts as an AI-powered email bot which fetches emails from Microsoft Outlook accounts using Microsoft Graph API, analyzes them with AI (Anthropic Claude), and sends consolidated email reports to specified recipients. The application is designed to run on a schedule (typically morning and evening) to provide categorized summaries of emails from multiple accounts.

### Key Features
- Fetches emails from Microsoft Outlook accounts using Microsoft Graph API with client credentials authentication
- Categorizes emails using Anthropic's Claude AI model into 7 categories (HR, Marketing, PNM, Audit, Accounts, DCR, Others)
- Sends HTML-formatted consolidated email reports via Gmail
- Maintains execution tracking to manage daily processing
- Supports multiple email accounts for both fetching and reporting
- Runs on Pakistan Time (PKT, UTC+5) schedule

### Architecture
- **Frontend**: N/A (CLI application)
- **Backend**: Node.js/JavaScript
- **AI Service**: Anthropic Claude API
- **Email Service**: Microsoft Graph API (fetching), Gmail with App Passwords (sending)
- **Database**: MongoDB with Mongoose ODM
- **Dependencies**: axios, dotenv, cheerio, nodemailer, mongoose, @anthropic-ai/sdk, etc.

## Building and Running

### Prerequisites
- Node.js version >=18.0.0
- MongoDB instance (local or cloud)
- Microsoft Azure application with client credentials for Graph API access
- Gmail account with App Password for sending reports
- Anthropic API key for AI categorization

### Environment Setup
Create a `.env` file with the following variables:
```
CLIENT_ID=your_azure_app_client_id
CLIENT_SECRET=your_azure_app_client_secret
MONGODB_URI=your_mongodb_connection_string
GOOGLE_SENDER_EMAIL=your_gmail_for_sending
GOOGLE_APP_PASSWORD=your_gmail_app_password
GOOGLE_RECIEVER_EMAIL_1=first_recipient_email
GOOGLE_RECIEVER_EMAIL_2=second_recipient_email
CLAUDE_API_KEY=your_claude_api_key
```

### Running the Application

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the main application** (fetches emails, categorizes them, and sends reports):
   ```bash
   node src/index.js
   ```

3. **Run scheduled execution** (checks time and runs if appropriate):
   ```bash
   node src/cron-daily.js
   ```

4. **Run specific time-based tests**:
   ```bash
   node test-morning.js      # For morning run simulation (10am PKT)
   node test-evening.js      # For evening run simulation (4pm PKT)
   node test-all-day.js      # For all-day email fetch
   ```

### Time-Based Execution Logic
- **Morning Run**: 9:00am-11:59am PKT (fetches emails from 4pm previous day to 10am current day)
- **Evening Run**: 3:00pm-5:59pm PKT (fetches emails from 10am to 4pm current day)
- Outside scheduled windows: Uses proximity to determine if it should behave as morning or evening run

## Development Conventions

### Code Structure
- `src/` - Main application source files
  - `index.js` - Main entry point that orchestrates the entire process
  - `fetchEmails.js` - Handles fetching emails from Microsoft Graph API
  - `categorizeEmails.js` - AI-based email categorization using Anthropic Claude
  - `emailService.js` - Handles sending consolidated reports via Gmail
  - `clientCredentialsAuth.js` - Microsoft Graph API authentication
  - `database/models.js` - Mongoose models and database operations
  - `extractText.js` - HTML email body processing with Cheerio
  - `cron-daily.js` - Scheduling logic for time-based execution
- `test-*.js` - Test files for simulating different run scenarios
- `*.json` - Configuration and test output files

### AI Categorization Logic
The application uses Anthropic Claude to categorize emails into 7 specific categories:
- 💼 HR: Hiring, benefits, payroll, leave requests
- 📢 Marketing: Campaigns, promotions, branding
- 🔧 PNM: Procurement, maintenance, vendor management
- 🔍 Audit: Compliance, inspections, quality checks
- 💰 Accounts: Invoices, payments, financial reports
- 🏫 DCR: Daily Campus Reports (highest priority category)
- 📦 Others: Everything else

### Error Handling
- Comprehensive error handling in all major functions
- Retry logic considerations (as noted in notes.txt)
- Graceful handling of token expiration and renewal
- Duplicate email detection and prevention

### Testing and Validation
- Test files for simulating different execution times
- JSON output for verifying email fetching results
- Detailed console logging for debugging purposes
- Validation of AI response formats with fallbacks