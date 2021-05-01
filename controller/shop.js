const Product = require("../models/product");
const Order = require("../models/order");

const path = require("path");
const fs = require('fs');
const pdfDocument = require("pdfkit");
const stripe = require('stripe')('STRIPE_KEY');

const ITEMS_PER_PAGE = 2;

exports.getAllProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;
  Product.find().countDocuments().then(numProds=>{
    totalItems = numProds;
    return Product.find()
    .skip((page-1)*ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
  }).then((products) => {
      res.render("shop/product-list.ejs", {
        pageTitle: "Products",
        prods: products,
        path: "/product-list",
        totalProducts:totalItems,
        currentPage:page,
        hasNextPage:ITEMS_PER_PAGE*page<totalItems,
        hasPrevPage: page > 1,
        nextPage:page+1,
        prevPage:page-1,
        lastPage:Math.ceil(totalItems/ITEMS_PER_PAGE),
      });
    })
    .catch((err) => next(err));
};

exports.shopHome = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;
  Product.find().countDocuments()
  .then(numProd => {
    totalItems = numProd;
    return   Product.find()
    .skip((page-1)*ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
  }).then((product) => {
      res.render("shop/home.ejs", {
        pageTitle: "Home",
        prods: product,
        path: "/",
        totalProducts:totalItems,
        currentPage:page,
        hasNextPage:ITEMS_PER_PAGE*page<totalItems,
        hasPrevPage: page > 1,
        nextPage:page+1,
        prevPage:page-1,
        lastPage:Math.ceil(totalItems/ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      return next(err);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      res.render("shop/orders.ejs", {
        pageTitle: "Orders",
        path: "/orders",
        orders: orders,
      });
    })
    .catch((err) => next(err));
};

exports.findById = (req, res, next) => {
  prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if(!product){
        return next(new Error("No Products Found!"));
      }
      res.render("shop/product-details", {
        pageTitle: "Product Detail",
        path: "",
        product: product,
      });
    })
    .catch((err) => next(err));
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => next(err));
};

exports.getCart = (req, res, next) => {
  let totalPrice = 0;
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items;
      products.forEach(prod=>{
        totalPrice += prod.quantity * prod.productId.price;
      });
      res.render("shop/cart.ejs", {
        path: "/cart",
        pageTitle: "Cart",
        totalPrice:totalPrice,
        products: products,
      });
    })
    .catch((err) =>next(err));
};

exports.postdeleteCartProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .deleteFromCart(prodId)
    .then(() => {
      res.redirect("/cart");
    })
    .catch((err) => next(err));
};

exports.postOrders = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: { email: req.user.email, userId: req.user },
        products: products,
      });
      return order.save();
    })
    .then(() => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => next(err));
};

exports.getInvoice = (req,res,next) =>{
  const orderId = req.params.orderId;
  const invoiceName = "Invoice - " + orderId + ".pdf";
  // const invoiceName = "invoice-5bb5d4bb26b636bdc25360a3.pdf";
  const invoicePath = path.join("data","invoices",invoiceName);
  Order.findById(orderId).
  then(order =>{
    if(!order){
      return next(new Error("Order not found"));
    }
    if(order.user.userId.toString() !== req.user._id.toString()){
      return next(new Error("Unauthorized"));
    }
    // fs.readFile(invoicePath,(err,data)=>{    // preloading data
    //   if(err){
    //     return next(err);
    //   }
      // const file = fs.createReadStream(invoicePath); //streaming data
      const pdfDoc = new pdfDocument();
      res.setHeader('Content-Type','application/pdf');
      res.setHeader('Content-Disposition','inline',__filename = invoiceName);
      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);
      pdfDoc.fontSize(26).text("Invoice",{underline:true});
      pdfDoc.text("-------------------------");
      let totalPrice = 0;
      order.products.forEach(prod => {
        totalPrice += (prod.quantity * prod.product.price);
        pdfDoc.text(prod.product.title + ' - ' + prod.quantity + ' * ' + ' $' + prod.product.price);
      });
      pdfDoc.text("Total : " + totalPrice);
      pdfDoc.end();
      // file.pipe(res);
      // res.send(data);
  }).catch(err => next(err)); 
};

exports.getCheckout = (req, res, next) => {
  let products;
  let total;
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      products = user.cart.items;
      total = 0;
      if(!products.length > 0){
        return res.render('shop/checkout', {
          path: '/checkout',
          pageTitle: 'Checkout',
          products: products,
          total: total,
          sessionId: ''
        });
      }
      products.forEach(p => {
        total += p.quantity * p.productId.price;
      });
      return stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: products.map(p => {
          return {
            name: p.productId.title,
            description: p.productId.description,
            amount: p.productId.price * 100,
            currency: 'inr',
            quantity: p.quantity
          };
        }),
        success_url: req.protocol + '://' + req.get('host') + '/checkout/success', // => http://localhost:3000
        cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
      });
    })
    .then(session => {
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Checkout',
        products: products,
        total: total,
        sessionId: session.id
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};