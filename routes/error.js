const express = require('express');

const page404 = require('../controller/error'); 
const page500 = require("../controller/500");

const router = express.Router();

router.use(page404);
router.use(page500);

module.exports = router;