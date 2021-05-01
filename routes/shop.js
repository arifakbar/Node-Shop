const express = require("express");

const shopController = require("../controller/shop");

const isAuth = require("../middleware/is-auth");
const router = express.Router();

router.get("/", shopController.shopHome);
router.get("/product-list", shopController.getAllProducts);
router.get("/cart", isAuth, shopController.getCart);
router.get("/orders", isAuth, shopController.getOrders);
router.post("/orders", isAuth, shopController.postOrders);

router.get("/product-details/:productId", shopController.findById);

router.post("/add-to-cart", isAuth, shopController.postCart);

router.post(
  "/delete-cart-product",
  isAuth,
  shopController.postdeleteCartProduct
);

router.get("/order/:orderId",isAuth,shopController.getInvoice);

router.get("/checkout",isAuth,shopController.getCheckout);
router.get("/checkout/success",isAuth,shopController.postOrders);
router.get("/checkout/cancel",isAuth,shopController.getCheckout);

module.exports = router;
