import mongoose from "mongoose";
import fs from "fs";
import path from "path";

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

// Schema for execution tracker
const executionTrackerSchema = new mongoose.Schema({
  lastExecutionDate: String,
  executionCount: {
    type: Number,
    default: 1,
  },
});

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
export const ExecutionTracker = mongoose.model(
  "ExecutionTracker",
  executionTrackerSchema
);
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

    // Initialize execution tracker if it doesn't exist
    const trackerExists = await ExecutionTracker.findOne();
    if (!trackerExists) {
      console.log("Creating new execution tracker in database");
      await ExecutionTracker.create({
        lastExecutionDate: null,
        executionCount: 1,
      });
      console.log("Execution tracker created successfully");
    }

    return true;
  } catch (error) {
    console.error("Error connecting to database:", error);
    throw error;
  }
};

// Database operations for execution tracker
export const getExecutionTracker = async (preserve = false) => {
  try {
    let tracker = await ExecutionTracker.findOne();
    if (!tracker) {
      console.log("No execution tracker found, creating new one...");
      tracker = await ExecutionTracker.create({
        lastExecutionDate: null,
        executionCount: 1,
      });
      // No emails to delete on first ever run
    }

    // Use local timezone date string
    const today = getCurrentLocalDateString();
    console.log(
      `Current date: ${today}, Last execution date: ${tracker.lastExecutionDate}`
    );

    if (!preserve) {
      // Check if we're starting a new day
      if (
        tracker.lastExecutionDate !== today &&
        tracker.lastExecutionDate !== null
      ) {
        console.log(
          `NEW DAY DETECTED: Old date: ${tracker.lastExecutionDate}, New date: ${today}`
        );

        // Delete all emails from previous day ONLY when transitioning to a new day
        // and there was a previous day (not first run ever)
        console.log("Deleting all emails from previous day...");
        await resetEmailsForNewDay();
        console.log("Emails from previous day deleted successfully.");

        // Reset counter for new day
        tracker.executionCount = 1;
        console.log(
          `Reset execution count to ${tracker.executionCount} for new day.`
        );
      } else if (tracker.lastExecutionDate === today) {
        // Same day, increment counter
        console.log(
          `Same day. Incrementing execution count from ${
            tracker.executionCount
          } to ${tracker.executionCount + 1}`
        );
        tracker.executionCount += 1;
      } else {
        // First ever run or first run of a day after initialization
        console.log("First run of the day.");
        tracker.executionCount = 1;
      }

      // Always update the date
      tracker.lastExecutionDate = today;
      await tracker.save();
      console.log(`Updated execution tracker: ${JSON.stringify(tracker)}`);
    }

    return tracker.executionCount;
  } catch (error) {
    console.error("Error managing execution tracker:", error);
    return 1; // Default to 1 if there's an error
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

    // First, remove duplicates by subject and receivedDateTime from the incoming emails
    const uniqueEmails = [];
    const seenKeys = new Set();

    emails.forEach((email) => {
      // Create a key based on subject and receivedDateTime
      const key = `${email.subject}|${email.receivedDateTime}`;

      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        // Add sourceEmail to each email object
        const emailWithSource = { ...email };
        if (sourceEmail) {
          emailWithSource.sourceEmail = sourceEmail;
        }
        uniqueEmails.push(emailWithSource);
      }
    });

    console.log(
      `🧹 Removed ${
        emails.length - uniqueEmails.length
      } duplicates from incoming emails`
    );
    console.log(`📊 Unique emails to process: ${uniqueEmails.length}`);

    // Now check for existing emails in database to avoid duplicates
    const existingEmailIds = await Email.find(
      { id: { $in: uniqueEmails.map((e) => e.id) } },
      { id: 1 }
    ).lean();

    const existingIds = new Set(existingEmailIds.map((e) => e.id));
    const newEmails = uniqueEmails.filter(
      (email) => !existingIds.has(email.id)
    );

    console.log(
      `📊 Found ${existingIds.size} existing emails, ${newEmails.length} new emails to add`
    );

    if (newEmails.length === 0) {
      console.log(
        "✅ All emails already exist in database, no duplicates to add"
      );
      return uniqueEmails; // Return the deduplicated emails
    }

    // Use insertMany for new emails only
    const result = await Email.insertMany(newEmails, {
      ordered: false, // Continue inserting even if some fail
    });

    console.log(
      `✅ Successfully saved ${newEmails.length} new emails to database (${result.length} inserted)`
    );

    return uniqueEmails; // Return the deduplicated emails
  } catch (error) {
    console.error("❌ Error saving emails to database:", error);

    // Check for duplicate key error
    if (error.code === 11000) {
      console.warn(
        "⚠️ Duplicate emails detected, trying individual insertion..."
      );

      // Try to save non-duplicate emails individually
      const savedEmails = [];
      let successCount = 0;
      let duplicateCount = 0;

      for (const email of emails) {
        try {
          await Email.create(email);
          savedEmails.push(email);
          successCount++;
        } catch (individualError) {
          if (individualError.code === 11000) {
            console.log(`⏭️ Email ${email.id} already exists, skipping`);
            duplicateCount++;
          } else {
            console.error(
              `❌ Error saving individual email ${email.id}:`,
              individualError
            );
          }
        }
      }

      console.log(
        `📊 Individual insertion results: ${successCount} saved, ${duplicateCount} duplicates, ${
          emails.length - successCount - duplicateCount
        } errors`
      );
      return savedEmails;
    }

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
