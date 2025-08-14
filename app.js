if(process.env.NODE_ENV != "Production"){
    require("dotenv").config();
}

const express = require("express");
const mongoose = require("mongoose");
const app = express();
const path = require("path");
// app.use('/uploads', express.static('uploads'));

const ejsMate = require("ejs-mate");
app.engine("ejs",ejsMate);
app.use(express.static(path.join(__dirname,"/public")));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({extended:true}));
const methodOverride = require("method-override");
app.use(methodOverride("_method"));
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const listingRoute = require("./routes/Listing.js");
const reviewRoute = require("./routes/Review.js");
const userRoute = require("./routes/User.js");

const User = require("./models/User.js");
//session and flash
const session = require("express-session");
const flash = require("connect-flash");
const mongoStore = require("connect-mongo");

const passport = require("passport");
const localStratagy = require("passport-local");
const { configDotenv } = require("dotenv");

//database connect
const altasDb = process.env.ATLAS_URL;
async function main(){
    await mongoose.connect(altasDb);
}
main().then((res)=>{
    console.log("Connected with DB");
})
.catch((err)=>{
    console.log(err);
});

const port = process.env.PORT;
app.listen(port,()=>{
    console.log(`${port} port is running`);
});


//session and cookies
const store = mongoStore.create({
    mongoUrl:altasDb,
    crypto:{
        secret:process.env.SESSION_KEY
    },
    touchAfter:24*3600, //maintain 24hr user logged in until no change on session
});

store.on("error",()=>{
    console.log("error found on store",err);
});

app.use(session({
    store,
    secret:process.env.SESSION_KEY, 
    resave:false,
    saveUninitialized:true,
    cookie : {
        expires:Date.now() + 7*24*60*60*1000,
        maxAge:7*24*60*60*1000,
        httpOnly:true,
    }}));
    
//flash 
app.use(flash());

//passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(new localStratagy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//responses
app.use((req,res,next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user || null;
    return next();
});

//root route
app.get("/",wrapAsync((req,res)=>{
        return res.render("listing/welcome.ejs");
}));
//Routes
app.use("/",userRoute);
app.use("/listing",listingRoute);
app.use("/listing/:id",reviewRoute);


app.all("*",(req,res,next)=>{
    return next(new ExpressError(404,"Page not found!"));
});

//error handling middleware
app.use((err,req,res,next)=>{
    let {statusCode,message}=err;
    return res.render("./listing/Error.ejs",{message});
});
