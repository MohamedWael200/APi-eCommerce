const express = require("express");
const router = express.Router();
const couponContrroler =  require("../Controllers/couponController");
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");

router.post("/create" ,auth , isAdmin , couponContrroler.createCoupon);
router.get("/coupons" ,auth , isAdmin , couponContrroler.GetAllCoupons);

module.exports = router;