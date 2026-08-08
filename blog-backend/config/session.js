const session = require('express-session');
const MongoStore = require('connect-mongo');

const setupSession = (app) => {
    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
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