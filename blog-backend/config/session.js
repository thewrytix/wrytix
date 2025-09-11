const session = require('express-session');
const MongoStore = require('connect-mongo');

const setupSession = (app) => {
    app.use(session({
        secret: process.env.SESSION_SECRET || 'your_secret_key',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI || "mongodb+srv://wrytix_admin:Kylerlee149143123.@cluster0.jorn0pz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
            ttl: 14 * 24 * 60 * 60,
            autoRemove: 'native'
        }),
        cookie: {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 24 * 60 * 60 * 1000,
        }
    }));
};

module.exports = setupSession;