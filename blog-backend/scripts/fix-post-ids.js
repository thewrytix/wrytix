const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Replace with your actual MongoDB connection string
const mongoURI = 'mongodb+srv://wrytix_admin:Kylerlee149143123.@cluster0.jorn0pz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; // e.g., 'mongodb://localhost:27017/test' or your Render MongoDB URI

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('Connected to MongoDB');
        try {
            const posts = await mongoose.connection.db.collection('posts').find({ id: null }).toArray();
            console.log(`Found ${posts.length} posts with id: null`);

            for (const post of posts) {
                await mongoose.connection.db.collection('posts').updateOne(
                    { _id: post._id },
                    { $set: { id: uuidv4() } }
                );
                console.log(`Updated post with _id: ${post._id}`);
            }

            console.log('Updated all post IDs');
        } catch (err) {
            console.error('Error updating posts:', err);
        } finally {
            await mongoose.connection.close();
            console.log('MongoDB connection closed');
        }
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });