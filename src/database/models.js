import mongoose from "mongoose";

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

// Creating models
export const ExecutionTracker = mongoose.model(
  "ExecutionTracker",
  executionTrackerSchema
);
export const Email = mongoose.model("Email", emailSchema);

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

    const today = new Date().toDateString();
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

// Database operations for emails
export const saveEmails = async (emails) => {
  try {
    if (emails.length === 0) {
      return [];
    }

    // Use bulkWrite with updateOne to handle potential duplicates
    const operations = emails.map((email) => ({
      updateOne: {
        filter: { id: email.id },
        update: {
          $setOnInsert: {
            ...email,
            fetchDate: new Date(),
            // We keep processed & categorized flags as set in the email object
          },
        },
        upsert: true,
      },
    }));

    const result = await Email.bulkWrite(operations);
    console.log(
      `✅ Processed ${emails.length} emails (${result.upsertedCount} new added to database)`
    );

    return emails;
  } catch (error) {
    console.error("Error saving emails to database:", error);
    // Check for duplicate key error
    if (error.code === 11000) {
      console.warn("Duplicate emails detected and skipped");
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

// Get emails for categorization
export const getEmailsForCategorization = async () => {
  try {
    // Get emails that haven't been categorized yet
    const emails = await Email.find({
      categorized: false,
      processed: true, // Only categorize emails that have been processed/fetched
    });

    // Mark these emails as categorized
    if (emails.length > 0) {
      const emailIds = emails.map((email) => email._id);
      await Email.updateMany(
        { _id: { $in: emailIds } },
        { $set: { categorized: true } }
      );
      console.log(`Marked ${emails.length} emails as categorized`);
    }

    console.log(
      `Retrieved ${emails.length} uncategorized emails for processing`
    );
    return emails;
  } catch (error) {
    console.error("Error getting emails for categorization:", error);
    return [];
  }
};
