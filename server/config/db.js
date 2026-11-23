const mongoose = require("mongoose");

const connectDb = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(mongoUri, {
    autoIndex: true,
    serverSelectionTimeoutMS: 10000
  });

  return mongoose.connection;
};

module.exports = { connectDb };
