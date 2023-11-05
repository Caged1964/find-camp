if (process.env.NODE_ENV !== "production") {
    require('dotenv').config()
}

const express = require('express');
const mongoose = require('mongoose');
const methodOverride = require('method-override')
const session = require('express-session')
const path = require('path');
const ejsMate = require('ejs-mate')
const flash = require('connect-flash')
const passport = require('passport')
const localStratergy = require('passport-local')
const MongoStore = require('connect-mongo');
// const Joi = require('joi')
const mongoSanitize = require('express-mongo-sanitize')
const helmet = require('helmet')

// const dbUrl = process.env.DB_URL
const dbUrl = process.env.DB_URL || 'mongodb://127.0.0.1:27017/find-camp'

mongoose.connect(dbUrl)
    .then(() => {
        console.log("Mongo Connection Open");
    })
    .catch((err) => {
        console.log("Mongo Error Occured");
        console.log(err);
    })


const campgroundRoutes = require('./routes/campgrounds')
const reviewRoutes = require('./routes/reviews')
const userRoutes = require('./routes/users')

const app = express();

const Campground = require('./models/campground')
const Review = require('./models/review')
const User = require('./models/user')

const ExpressError = require('./utils/expressError')

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

const secret = process.env.SECRET || 'secretissecret'

const store = MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 60 * 60,    // this here is in seconds and not miliseconds
    crypto: {
        secret,
    }
});

store.on('error', function(e){
    console.log('Session Store Error', e)
})

const sessionConfig = {
    store ,    // should be written as "store: store" if it's not named as store 
    name: 'randomsessionname',   // using custom name for cookies instead of default one, so that some doesn't misuses it
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,    // our cookies which are set through the session are only accessible over http and not accessible through javascript
        // should use 'secure:true' when we deploy 
        //secure : true ,   // cookies should only work over 'https' and not 'http', localhost is not 'https'
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,   //if we want to expire in 7 days , Date.now give in miliseconds
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}

app.use(express.urlencoded({ extended: true }))
app.use(methodOverride('_method'))
app.use(express.static(path.join(__dirname, 'public')))
app.use(session(sessionConfig))   // normal session
app.use(flash())

app.use(passport.initialize())
app.use(passport.session())    /// normal session should be used before passport session
passport.use(new localStratergy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

// app.use(mongoSanitize());     // this doesnt allow any keys in req.query or req.body or req.params to contain dollar sign or period sign
app.use(mongoSanitize({ replaceWith: '_', }),);    // replaces '$'  and  '.' with '_' 

const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net/"
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    "https://stackpath.bootstrapcdn.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
    "https://cdn.jsdelivr.net/"
];
const connectSrcUrls = [];
const fontSrcUrls = [];
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://res.cloudinary.com/dhnofmntc/", //SHOULD MATCH YOUR CLOUDINARY ACCOUNT! 
                "https://images.unsplash.com/",
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);

app.use((req, res, next) => {
    if (!['/login', '/'].includes(req.originalUrl)) {
        req.session.returnTo = req.originalUrl
    }
    res.locals.currentUser = req.user
    res.locals.success = req.flash('success')
    res.locals.error = req.flash('error')
    next()
})

app.use('/', userRoutes)
app.use('/campgrounds', campgroundRoutes)
app.use('/campgrounds/:id/reviews', reviewRoutes)

app.get('/', (req, res) => {
    // res.send("Working")
    res.render('home')
})


app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err
    if (!err.message) err.message = "Something Went Wrong"
    res.status(statusCode).render('error', { err })
})

const port = process.env.PORT || 3000

app.listen(port, () => {
    console.log(`LISTENING ON PORT ${port}!!!`)
})
