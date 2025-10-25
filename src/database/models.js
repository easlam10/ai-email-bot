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






// Schema for execution tracking
const executionTrackerSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true, // Each date should only have one tracker
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


// Get execution count for today from MongoDB
export const getExecutionTracker = async () => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const tracker = await ExecutionTracker.findOne({ date: today });

    if (!tracker) {
      console.log(`📅 No execution tracker found for ${today}, creating new one`);
      const newTracker = new ExecutionTracker({ date: today, count: 0 });
      await newTracker.save();
      return { count: 0, date: today };
    }

    return { count: tracker.count, date: tracker.date };
  } catch (error) {
    console.error('❌ Error getting execution tracker from database:', error);
    return { count: 0, date: new Date().toISOString().split('T')[0] }; // Fallback
  }
};

// Update execution count using MongoDB
export const updateExecutionCount = async () => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    let tracker = await ExecutionTracker.findOne({ date: today });

    if (!tracker) {
      // Create a new tracker for today if it doesn't exist
      console.log(`📅 Creating execution tracker for new day: ${today}`);
      tracker = new ExecutionTracker({ date: today, count: 1 });
    } else {
      // Increment the existing count
      tracker.count++;
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




