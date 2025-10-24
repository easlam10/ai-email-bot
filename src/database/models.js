import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to get current date in local timezone format
const getCurrentLocalDateString = () => {
  const now = new Date();
  return now.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Karachi", // Pakistan timezone
  });
};


// Schema for emails
const emailSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true, // Add unique index to prevent duplicates
    required: true,
  },
  subject: String,
  from: {
    name: String,
    email: String,
  },
  date: String,
  body: String,
  webLink: String, // Add webLink field to store URL to original email
  sourceEmail: String, // Add field to track which email account this came from
  fetchDate: {
    type: Date,
    default: Date.now,
  },
  processed: {
    type: Boolean,
    default: false,
  },
  categorized: {
    type: Boolean,
    default: false,
  },
});

// Schema for authentication tokens
const tokenSchema = new mongoose.Schema({
  id: {
    type: String,
    default: "microsoft_graph_token",
    unique: true,
  },
  access_token: {
    type: String,
    required: true,
  },
  refresh_token: {
    type: String,
  },
  expires_at: {
    type: String, // Changed to String to store ISO date string
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Creating models
export const Email = mongoose.model("Email", emailSchema);
export const Token = mongoose.model("Token", tokenSchema);

// Function to initialize the database connection
export const connectToDatabase = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB successfully!");

    // Ensure indexes are created and enforced
    await Email.init();

  
    return true;
  } catch (error) {
    console.error("Error connecting to database:", error);
    throw error;
  }
};


// Simple file-based execution tracking
export const getExecutionTracker = async () => {
  return { success: true };
};

// Update execution count using file-based approach
export const updateExecutionCount = () => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const trackerFile = path.join(__dirname, '../../execution-tracker.json');

  let tracker = { count: 0, date: today };

  try {
    // Check if file exists, if not create it with default values
    if (!fs.existsSync(trackerFile)) {
      console.log('📝 Creating execution-tracker.json file with default values...');
      tracker = { count: 0, date: today };
      fs.writeFileSync(trackerFile, JSON.stringify(tracker, null, 2));
    } else {
      // Read existing file
      const fileContent = fs.readFileSync(trackerFile, 'utf8');
      tracker = JSON.parse(fileContent);

      // Reset if it's a new day
      if (tracker.date !== today) {
        console.log(`📅 New day detected (${today}), resetting execution count`);
        tracker = { count: 0, date: today };
      }
    }

    // Increment count
    tracker.count++;

    // Save back to file
    fs.writeFileSync(trackerFile, JSON.stringify(tracker, null, 2));

    console.log(`🔢 Execution #${tracker.count} for ${tracker.date}`);
    return tracker;

  } catch (error) {
    console.error('❌ Error tracking execution:', error);

    // If file operations fail, try to create a fresh file
    try {
      console.log('🔄 Attempting to create fresh execution-tracker.json file...');
      const freshTracker = { count: 1, date: today };
      fs.writeFileSync(trackerFile, JSON.stringify(freshTracker, null, 2));
      console.log(`✅ Created fresh execution tracker: Execution #${freshTracker.count} for ${freshTracker.date}`);
      return freshTracker;
    } catch (fallbackError) {
      console.error('❌ Failed to create execution tracker file:', fallbackError);
      return { count: 1, date: today }; // Final fallback
    }
  }
};

// Reset emails for a new day and apply retention policy
export const resetEmailsForNewDay = async () => {
  try {
    // Delete ALL emails from the previous day instead of just resetting flags
    const deleteResult = await Email.deleteMany({});
    console.log(
      `DELETED ALL ${deleteResult.deletedCount} emails from database for new day`
    );

    return true;
  } catch (error) {
    console.error("Error resetting emails for new day:", error);
    throw error;
  }
};

// Function to remove emails older than the retention period (default: 7 days)
export const cleanupOldEmails = async (retentionDays = 7) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await Email.deleteMany({
      fetchDate: { $lt: cutoffDate },
    });

    console.log(
      `Cleaned up ${result.deletedCount} emails older than ${retentionDays} days`
    );
  } catch (error) {
    console.error("Error cleaning up old emails:", error);
  }
};

// Function to remove duplicate emails by subject and receivedDateTime
export const removeDuplicateEmails = async () => {
  try {
    console.log("🧹 Starting duplicate email cleanup...");

    // Get all emails
    const allEmails = await Email.find({}).sort({ receivedDateTime: 1 });
    console.log(`📊 Found ${allEmails.length} total emails in database`);

    // Group emails by subject and receivedDateTime
    const emailGroups = {};
    const duplicatesToRemove = [];

    allEmails.forEach((email) => {
      // Create a key based on subject and receivedDateTime
      const key = `${email.subject}|${email.receivedDateTime}`;

      if (!emailGroups[key]) {
        emailGroups[key] = [];
      }
      emailGroups[key].push(email);
    });

    // Find duplicates (keep the first one, mark others for deletion)
    Object.values(emailGroups).forEach((group) => {
      if (group.length > 1) {
        // Keep the first email, mark the rest for deletion
        for (let i = 1; i < group.length; i++) {
          duplicatesToRemove.push(group[i]._id);
        }
      }
    });

    console.log(
      `🔍 Found ${duplicatesToRemove.length} duplicate emails to remove`
    );

    if (duplicatesToRemove.length > 0) {
      // Remove duplicates
      const result = await Email.deleteMany({
        _id: { $in: duplicatesToRemove },
      });
      console.log(
        `✅ Removed ${result.deletedCount} duplicate emails from database`
      );
    } else {
      console.log("✅ No duplicates found");
    }

    // Get final count
    const finalCount = await Email.countDocuments();
    console.log(`📊 Final email count: ${finalCount}`);

    return {
      totalEmails: allEmails.length,
      duplicatesRemoved: duplicatesToRemove.length,
      finalCount: finalCount,
    };
  } catch (error) {
    console.error("❌ Error removing duplicate emails:", error);
    throw error;
  }
};

// Function to clean up existing duplicates in database (run manually when needed)
export const cleanupExistingDuplicates = async () => {
  try {
    console.log("🧹 Starting cleanup of existing duplicates in database...");

    // Get all emails
    const allEmails = await Email.find({}).sort({ receivedDateTime: 1 });
    console.log(`📊 Found ${allEmails.length} total emails in database`);

    // Group emails by subject and receivedDateTime
    const emailGroups = {};
    const duplicatesToRemove = [];

    allEmails.forEach((email) => {
      // Create a key based on subject and receivedDateTime
      const key = `${email.subject}|${email.receivedDateTime}`;

      if (!emailGroups[key]) {
        emailGroups[key] = [];
      }
      emailGroups[key].push(email);
    });

    // Find duplicates (keep the first one, mark others for deletion)
    Object.values(emailGroups).forEach((group) => {
      if (group.length > 1) {
        // Keep the first email, mark the rest for deletion
        for (let i = 1; i < group.length; i++) {
          duplicatesToRemove.push(group[i]._id);
        }
      }
    });

    console.log(
      `🔍 Found ${duplicatesToRemove.length} duplicate emails to remove`
    );

    if (duplicatesToRemove.length > 0) {
      // Remove duplicates
      const result = await Email.deleteMany({
        _id: { $in: duplicatesToRemove },
      });
      console.log(
        `✅ Removed ${result.deletedCount} duplicate emails from database`
      );
    } else {
      console.log("✅ No duplicates found");
    }

    // Get final count
    const finalCount = await Email.countDocuments();
    console.log(`📊 Final email count: ${finalCount}`);

    return {
      totalEmails: allEmails.length,
      duplicatesRemoved: duplicatesToRemove.length,
      finalCount: finalCount,
    };
  } catch (error) {
    console.error("❌ Error removing duplicate emails:", error);
    throw error;
  }
};

// Database operations for emails
export const saveEmails = async (emails, sourceEmail = null) => {
  try {
    if (emails.length === 0) {
      return [];
    }

    console.log(`🔄 Attempting to save ${emails.length} emails to database...`);

    // Add sourceEmail to each email object
    const emailsWithSource = emails.map((email) => {
      const emailWithSource = { ...email };
      if (sourceEmail) {
        emailWithSource.sourceEmail = sourceEmail;
      }
      return emailWithSource;
    });

    // Use insertMany with ordered: false to continue even if duplicates exist
    try {
      const result = await Email.insertMany(emailsWithSource, {
        ordered: false, // Continue inserting even if some fail due to duplicates
      });
      console.log(
        `✅ Successfully saved ${result.length} new emails to database`
      );
    } catch (error) {
      // Handle duplicate key errors gracefully
      if (error.code === 11000) {
        const insertedCount = error.result?.insertedCount || 0;
        console.log(
          `✅ Saved ${insertedCount} new emails (some were duplicates and skipped)`
        );
      } else {
        throw error; // Re-throw non-duplicate errors
      }
    }

    console.log(
      `✅ Returning ${emailsWithSource.length} emails for processing`
    );
    return emailsWithSource;
  } catch (error) {
    console.error("❌ Error saving emails to database:", error);
    throw error;
  }
};

// Get unprocessed emails
export const getUnprocessedEmails = async () => {
  try {
    // Find emails that haven't been processed yet
    const unprocessedEmails = await Email.find({ processed: false }).lean();

    console.log(`Found ${unprocessedEmails.length} unprocessed emails`);

    // Mark these emails as processed
    if (unprocessedEmails.length > 0) {
      const emailIds = unprocessedEmails.map((email) => email._id);
      await Email.updateMany(
        { _id: { $in: emailIds } },
        { $set: { processed: true } }
      );
      console.log(`Marked ${unprocessedEmails.length} emails as processed`);
    }

    return unprocessedEmails;
  } catch (error) {
    console.error("Error getting unprocessed emails:", error);
    return [];
  }
};

// Get emails for categorization (without marking them as categorized yet)
export const getEmailsForCategorization = async (sourceEmail = null) => {
  try {
    // Build query filter
    const filter = {
      categorized: false,
      processed: true, // Only categorize emails that have been processed/fetched
    };

    // Add sourceEmail filter if provided
    if (sourceEmail) {
      filter.sourceEmail = sourceEmail;
    }

    // Get emails that haven't been categorized yet
    const emails = await Email.find(filter);

    console.log(
      `Retrieved ${emails.length} uncategorized emails for processing${
        sourceEmail ? ` from ${sourceEmail}` : ""
      }`
    );
    return emails;
  } catch (error) {
    console.error("Error getting emails for categorization:", error);
    return [];
  }
};

// Mark emails as categorized after successful AI processing
export const markEmailsAsCategorized = async (emails) => {
  try {
    if (emails.length > 0) {
      const emailIds = emails.map((email) => email._id);
      await Email.updateMany(
        { _id: { $in: emailIds } },
        { $set: { categorized: true } }
      );
      console.log(
        `✅ Marked ${emails.length} emails as categorized after successful AI processing`
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error marking emails as categorized:", error);
    throw error;
  }
};

// Save authentication token to database
export const saveToken = async (
  accessToken,
  expiresIn,
  refreshToken = null,
  tokenId = "microsoft_graph_token"
) => {
  try {
    // Calculate expiration date as an ISO string
    const expiryDate = new Date(Date.now() + expiresIn * 1000).toISOString();

    const updateData = {
      access_token: accessToken,
      expires_at: expiryDate,
      created_at: new Date(),
    };

    // Only add refresh_token if provided
    if (refreshToken) {
      updateData.refresh_token = refreshToken;
    }

    await Token.updateOne({ id: tokenId }, updateData, { upsert: true });

    console.log(
      `✅ Token saved to database (${tokenId}), expires at: ${expiryDate}`
    );
    return true;
  } catch (error) {
    console.error("Error saving token to database:", error);
    throw error;
  }
};

// Get valid token from database or return null if not valid
export const getValidToken = async (tokenId = "microsoft_graph_token") => {
  try {
    const token = await Token.findOne({ id: tokenId });

    if (!token) {
      console.log("No token found in database");
      return null;
    }

    // Parse the ISO date string to get expiration time
    const expiryDate = new Date(token.expires_at);
    const now = new Date();
    const oneMinute = 60 * 1000; // 1 minute in milliseconds

    // Check if token is expired (with 1-minute buffer)
    if (expiryDate.getTime() <= now.getTime() + oneMinute) {
      console.log(`Token expired at ${token.expires_at}`);
      return null;
    }

    console.log(`Using valid token that expires at ${token.expires_at}`);
    return token.access_token;
  } catch (error) {
    console.error(`Error getting token (${tokenId}) from database:`, error);
    return null;
  }
};

// Get token object including refresh token
export const getTokenObject = async (tokenId = "microsoft_graph_token") => {
  try {
    const token = await Token.findOne({ id: tokenId });

    if (!token) {
      return null;
    }

    const expiryDate = new Date(token.expires_at);
    const now = new Date();
    const oneMinute = 60 * 1000; // 1 minute in milliseconds

    return {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
      is_expired: expiryDate.getTime() <= now.getTime() + oneMinute,
    };
  } catch (error) {
    console.error(
      `Error getting token object (${tokenId}) from database:`,
      error
    );
    return null;
  }
};

// Import token from token.json file to database
export const importTokenFromFile = async (
  filePath,
  tokenId = "outlook_personal_token" // Changed the default token ID to avoid conflicts
) => {
  try {
    // Read token.json file
    console.log(`Reading token file from ${filePath}...`);
    const tokenData = JSON.parse(fs.readFileSync(filePath, "utf8"));

    if (
      !tokenData.access_token ||
      !tokenData.refresh_token ||
      !tokenData.expires_at
    ) {
      throw new Error("Token file missing required fields");
    }

    // Calculate expiration time
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    // Store expiration time as milliseconds timestamp for consistent handling
    const expiresAtMs = expiresAt.getTime();
    const expiresIn = Math.floor((expiresAtMs - now.getTime()) / 1000); // Convert ms to seconds

    if (expiresIn <= 0) {
      console.log("⚠️ Warning: Token in file is already expired");
    }

    // Store both the expiry timestamp and refresh token
    await saveToken(
      tokenData.access_token,
      expiresIn,
      tokenData.refresh_token,
      tokenId
    );

    console.log(`✅ Token imported from file to database (${tokenId})`);
    console.log(
      `   Token expires at: ${expiresAt.toISOString()} (in ${expiresIn} seconds)`
    );
    return true;
  } catch (error) {
    console.error("Error importing token from file:", error);
    throw error;
  }
};
