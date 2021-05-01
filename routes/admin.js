const express = require("express");
const {check,body} = require("express-validator/check");

const userController = require("../controller/admin");
const isAuth = require("../middleware/is-auth");
const User = require("../models/user");

const router = express.Router();

router.get("/add-product", isAuth, userController.getAddproduct);

router.post("/add-product",[
        body("title").trim().isLength({min:3}).withMessage("Title must be alteast of 3 characters").isAlphanumeric().withMessage("Title can only be numbers or alphabets"),
        body("price").isNumeric(),
        body("description").isLength({min:5}).withMessage("Description must be alteast of 5 characters").trim()
], isAuth, userController.postAddproduct);

router.get("/edit-product/:productId", isAuth, userController.editProduct);

router.post("/edit-product", [
        body("title").trim().isLength({min:3}).withMessage("Title must be alteast of 3 characters").isAlphanumeric().withMessage("Title can only be numbers or alphabets"),
        body("price").isNumeric(),
        body("description").isLength({min:5}).withMessage("Description must be alteast of 5 characters").trim()
],isAuth, userController.postEditProduct);

router.get("/products", isAuth, userController.getAllProducts);

// router.post("/delete-product", isAuth, userController.deleteProduct); 
router.delete("/product/:productId",isAuth,userController.deleteProduct);

router.get("/login",userController.getLogin);

router.post("/login",[
        body("email").trim().isEmail().withMessage("Please Enter a valid email"),
],userController.postLogin);

router.get("/signup", userController.getSignup);

router.post("/signup", [
        check('email').trim().isEmail().withMessage("Please enter a valid email!").normalizeEmail(),
        // .custom((value,{req})=>{
        //         User.findOne({email:value})
        //         .then((user)=>{
        //                 if(user){
        //                         return Promise.reject('E-mail already in use');
        //                 }
        //         });
        // }),
        body("password","Password must be atleast of 5 character and contain only numbers or alphabets").isLength({min:5}).isAlphanumeric(),
        body("confirmPassword").custom((value,{req})=>{
                if(value !== req.body.password){
                        throw new Error("Passwords does not match!");
                }
                return true;
        })
],userController.postSignup);

router.post("/logout", userController.postLogout);

router.get("/resetPassword", userController.getReset);

router.post("/resetPassword", userController.postReset);

router.get("/newPassword/:token", userController.getNewPassword);

router.post("/newPassword", userController.postNewPassword);

module.exports = router;
