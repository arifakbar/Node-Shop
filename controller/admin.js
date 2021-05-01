const Product = require("../models/product");
const User = require("../models/user");
const fileHelper = require("../utils/file");

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const { validationResult } = require("express-validator");

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key:
        "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",
    },
  })
);

const ITEMS_PER_PAGE = 2;

exports.getAddproduct = (req, res, next) => {
  res.render("admin/edit-product.ejs", {
    pageTitle: "Add Product",
    path: "/add-product",
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: [],
  });
};
exports.postAddproduct = (req, res, next) => {
  errors = validationResult(req);
  userId = req.user;
  title = req.body.title;
  price = req.body.price;
  description = req.body.description;
  imageUrl = req.file;
  if (!imageUrl) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/add-product",
      editing: false,
      hasError: true,
      product: { title: title, price: price, description: description },
      errorMessage: "Attached file format is not supported!",
      validationErrors: [],
    });
  }
  if (!errors.isEmpty()) {
    console.log(errors);
    return res.status(422).render("admin/edit-product", {
      path: "/add-product",
      pageTitle: "Add Product",
      editing: false,
      hasError: true,
      product: { title: title, price: price, description: description },
      errorMessage: errors.array()[0].msg,
      validationErrors: [],
    });
  }
  const image = imageUrl.path;
  const product = new Product({
    userId: userId,
    title: title,
    price: price,
    description: description,
    image: image,
  });
  product
    .save()
    .then(() => {
      res.redirect("/");
    })
    .catch((err) => {
      console.log(err);
      return next(err);
    });
};

exports.getAllProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;
  Product.find({ userId: req.user._id })
    .countDocuments()
    .then((numProds) => {
      totalItems = numProds;
      return Product.find({ userId: req.user._id })
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((product) => {
      if (!product) {
        return next(err);
      }
      res.render("admin/products.ejs", {
        pageTitle: "Add-Products",
        prods: product,
        path: "/products",
        totalProducts: totalItems,
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPrevPage: page > 1,
        nextPage: page + 1,
        prevPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => next(err));
};

exports.editProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/500");
      }
      res.render("admin/edit-product", {
        path: "",
        pageTitle: "Edit product",
        editing: true,
        hasError: false,
        product: product,
        errorMessage: null,
        validationErrors: [],
      });
    })
    .catch((err) => next(err));
};

exports.postEditProduct = (req, res, next) => {
  errors = validationResult(req);
  const prodId = req.body.productId;
  const title = req.body.title;
  const price = req.body.price;
  const imageUrl = req.file;
  const description = req.body.description;
  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      path: "/add-product",
      pageTitle: "Add Product",
      hasError: true,
      editing: false,
      product: { title: title, price: price, description: description },
      validationErrors: errors.array(),
      errorMessage: errors.array()[0].msg,
    });
  }
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.render("/500");
      }
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect("/login");
      }
      product.title = title;
      product.price = price;
      product.description = description;
      if (imageUrl) {
        fileHelper.deleteFile(product.image);
        product.image = imageUrl.path;
      }
      return product.save();
    })
    .then((t) => {
      res.redirect("/products");
    })
    .catch((err) => {
      console.log(err);
      return next(err);
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((prod) => {
      if (!prod) {
        return next(new Error("Product not found."));
      }
      fileHelper.deleteFile(prod.image);
      return Product.deleteOne({ _id: prodId, userId: req.user._id });
    })
    .then(() => {
      res.status(200).json({ message: "Done" });
    })
    .catch((err) => res.status(500).json({ messahe: "Failed" }));
};

exports.getLogin = (req, res, next) => {
  let message = req.flash("error");
  console.log(message);
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("admin/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
  });
};

exports.postLogin = (req, res, next) => {
  const errors = validationResult(req);
  const email = req.body.email;
  const password = req.body.password;
  if (!errors.isEmpty()) {
    return res.status(422).render("admin/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
    });
  }
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        req.flash("error", "Invalid Creds");
        return res.redirect("/login");
      }
      bcrypt.compare(password, user.password).then((matched) => {
        if (matched) {
          req.session.isLoggedIn = true;
          req.session.user = user;
          return req.session.save((err) => {
            console.log(err);
            res.redirect("/");
          });
        }
        req.flash("error", "Invalid Creds");
        res.redirect("/login");
      });
    })
    .catch((err) => next(err));
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error");
  console.log(message);
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("admin/signup", {
    path: "/signup",
    pageTitle: "Signup",
    validationErrors: [],
    errorMessage: message,
  });
};

exports.postSignup = (req, res, next) => {
  const errors = validationResult(req);
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  if (!errors.isEmpty()) {
    console.log(errors);
    return res.status(422).render("admin/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }
  User.findOne({ email: email })
    .then((user) => {
      if (user) {
        req.flash(
          "error",
          "E-Mail exists already, please pick a different one."
        );
        return res.redirect("/signup");
      }
      return bcrypt
        .hash(password, 12)
        .then((hashedPassword) => {
          const user = new User({
            email: email,
            password: hashedPassword,
            cart: { items: [] },
          });
          return user.save();
        })
        .then(() => {
          res.redirect("/login");
          return transporter.sendMail({
            to: email,
            from: "aceLight@gamil.com",
            subject: "Signed Up Successfully",
            html: "<h1>Done</h1>",
          });
        })
        .catch((err) => next(err));
    })
    .catch((err) => next(err));
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  console.log(message);
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("admin/resetPassword.js", {
    path: "/resetPassword",
    pageTitle: "Reset Password",
    errorMessage: message,
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.render("/resetPassword");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.emai })
      .then((user) => {
        if (!user) {
          req.flash("error", "No registered email found! ");
          return res.redirect("/resetPassword");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then(() => {
        res.redirect("/");
        transporter.sendMail({
          to: req.body.email,
          from: "aceLight@gamil.com",
          subject: "Reset Pwd",
          html: `<p>Click this <a href='http://localhost:3000/reset/${token}'>this</a> to set a new password.</p>`,
        });
      })
      .catch((err) => {
        next(err);
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({
    resetToken: token,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then((user) => {
      res.render("admin/newPassword", {
        path: "/newPassword",
        pageTitle: "New Password",
        errorMessage: req.flash("error"),
        paswordToken: token,
        userId: user._id.toString(),
      });
    })
    .cetch((err) => next(err));
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;
  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then(() => {
      res.redirect("/login");
    })
    .catch((err) => next(err));
};
