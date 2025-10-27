import mongoose from "mongoose";

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






// Schema for execution tracking - single document that updates date and count
const executionTrackerSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(), // Fixed ID for single document
  },
  date: {
    type: String,
    required: true,
  },
  count: {
    type: Number,
    default: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});


export const ExecutionTracker = mongoose.model("ExecutionTracker", executionTrackerSchema);

// Function to initialize the database connection
export const connectToDatabase = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB successfully!");

    return true;
  } catch (error) {
    console.error("Error connecting to database:", error);
    throw error;
  }
};


// Get execution tracker from MongoDB - always use the single document
export const getExecutionTracker = async () => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Always look for the single execution tracker document
    let tracker = await ExecutionTracker.findOne();

    if (!tracker) {
      console.log(`📅 No execution tracker found, creating new one for ${today}`);
      const newTracker = new ExecutionTracker({ date: today, count: 0 });
      await newTracker.save();
      return { count: 0, date: today };
    }

    // If the tracker date is different from today, update the date and reset count
    if (tracker.date !== today) {
      console.log(`📅 New day detected, updating tracker from ${tracker.date} to ${today}`);
      tracker.date = today;
      tracker.count = 0;
      tracker.lastUpdated = new Date();
      await tracker.save();
      return { count: 0, date: today };
    }

    return { count: tracker.count, date: tracker.date };
  } catch (error) {
    console.error('❌ Error getting execution tracker from database:', error);
    return { count: 0, date: new Date().toISOString().split('T')[0] }; // Fallback
  }
};

// Update execution count using MongoDB - always update the single document
export const updateExecutionCount = async () => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Always look for the single execution tracker document
    let tracker = await ExecutionTracker.findOne();

    if (!tracker) {
      // Create a new tracker if none exists
      console.log(`📅 Creating execution tracker for ${today}`);
      tracker = new ExecutionTracker({ date: today, count: 1 });
    } else {
      // If the tracker date is different from today, update the date and reset count
      if (tracker.date !== today) {
        console.log(`📅 New day detected, updating tracker from ${tracker.date} to ${today}`);
        tracker.date = today;
        tracker.count = 1; // Start count at 1 for the new day
      } else {
        // Increment the existing count
        tracker.count++;
      }
    }

    // Update the last updated timestamp
    tracker.lastUpdated = new Date();

    // Save the updated tracker to database
    await tracker.save();

    console.log(`🔢 Execution #${tracker.count} for ${tracker.date}`);
    return { count: tracker.count, date: tracker.date };
  } catch (error) {
    console.error('❌ Error updating execution count in database:', error);

    // Fallback to return a simple count
    return { count: 1, date: new Date().toISOString().split('T')[0] };
  }
};







;




