const express = require("express");
const router = express.Router();
const categoryContrroler =  require("../Controllers/categoryContrroler");
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");

router.post("/create" ,auth , isAdmin , categoryContrroler.createCategory)
router.get("/categories" , categoryContrroler.getAllCategories)
router.get("/categoriesDeleted" , categoryContrroler.getAllDeletedCategories)
router.patch("/update/:id" ,auth , isAdmin , categoryContrroler.updateCategory)
router.delete("/delete/:id" ,auth , isAdmin , categoryContrroler.deleteCategory)
router.patch("/restore/:id" ,auth , isAdmin , categoryContrroler.restoreCategory)

module.exports = router;