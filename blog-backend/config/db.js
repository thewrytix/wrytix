const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb+srv://wrytix_admin:Kylerlee149143123.@cluster0.jorn0pz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
        console.log("✅ MongoDB Connected");
    } catch (err) {
        console.error("❌ MongoDB connection failed:", err.message);
        process.exit(1);
    }
};

module.exports = connectDB;