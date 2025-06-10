const express = require("express");
const router = express.Router();
const userContrroler =  require("../Controllers/userControllers");
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");

router.get("/users" ,auth , isAdmin , userContrroler.allUsers)
router.patch("/users/:id/ban" ,auth , isAdmin , userContrroler.userStatusBanned)
router.patch("/users/:id/active" ,auth , isAdmin , userContrroler.userStatusActive)
router.patch("/users/:id/toVendor" ,auth , isAdmin , userContrroler.userRoleAdminToVendor)

module.exports = router;