const path = require("path");
const fs = require('fs');

const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const MongodbStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");
const helmet = require('helmet');
const compression = require("compression");
const morgan = require('morgan');

const app = express();

const store = new MongodbStore({
  uri:
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@udemy-cluster.qubpg.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`,
  collection: "session",
});
const csrfProtection = csrf();

const fileStorage = multer.diskStorage({
  destination:(req,file,cb)=>{
    cb(null,'images');
  },
  filename:(req,file,cb) =>{
    cb(null, file.fieldname + ' - ' + file.originalname);
  }
});

const fileFilter = (req,file,cb) => {
  if(file.mimetype === "image/jpg" || file.mimetype === "image/png" || file.mimetype === "image/jpeg"){
    cb(null, true);
  }else{
    cb(null, false);
  }
};

const accesslogStream = fs.writeFileSync(path.join(__dirname,'access.log'),{flags:'a'});

app.set("view engine", "ejs");
app.set("views", "views");

const adminRouter = require("./routes/admin");
const shopRouter = require("./routes/shop");
const errorRouter = require("./routes/error");

app.use(helmet());
app.use(compression());
app.use(morgan("combined",{stream:accesslogStream}));

const User = require("./models/user");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(multer({storage:fileStorage,fileFilter:fileFilter}).single("image"));
app.use("/images",express.static(path.join(__dirname, "images")));

app.use(
  session({
    secret: "any long string",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if(!user){
        return res.render("/500");
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
});


app.use(adminRouter);
app.use(shopRouter);
app.use(errorRouter);

app.use((error, req, res, next) => {
  console.log(error);
  res.status(500).render("500", {
    pageTitle: "Error",
    path: "/500"
  });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@udemy-cluster.qubpg.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}?retryWrites=true&w=majority`
  )
  .then((result) => {
    User.findOne().then((user) => {
      if (!user) {
        const user = new User({
          name: "Ace",
          email: "test@test.com",
          cart: {
            items: [],
          },
        });
        user.save();
      }
    });
    app.listen( process.env.PORT || 3000);
  })
  .catch((err) => console.log(err));
