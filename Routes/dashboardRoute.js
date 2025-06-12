const express = require("express");
const router = express.Router();
const dashboardContrroler =  require("../Controllers/dashboardController");
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const isVendor = require("../middleware/isVendor");

router.get("/users" ,auth , isAdmin , dashboardContrroler.dashboard)
router.get("/vendor" ,auth , isVendor , dashboardContrroler.vendorDashoard)

module.exports = router;