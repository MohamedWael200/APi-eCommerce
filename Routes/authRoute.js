const express = require("express");
const router = express.Router();
const authContrroler =  require("../Controllers/authControllrs");
const auth = require("../middleware/auth");
const upload = require("../middleware/multer");
const limiter = require("../middleware/Limiter")

router.use(limiter);

router.post("/register" ,upload.single("image") , authContrroler.register)
router.post("/login"  ,limiter , authContrroler.login)
router.post("/verfyOtp",  authContrroler.verifyToken);

module.exports = router;