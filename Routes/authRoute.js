const express = require("express");
const router = express.Router();
const authContrroler =  require("../Controllers/authControllrs");
const auth = require("../middleware/auth");
const upload = require("../middleware/multer");


router.post("/register" ,upload.single("image") , authContrroler.register)
router.post("/login"  , authContrroler.login)
router.post("/verfyOtp",  authContrroler.verifyToken);

module.exports = router;