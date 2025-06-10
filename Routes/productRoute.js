const express = require("express");
const router = express.Router();
const ProductContrroler = require("../Controllers/productContrroler");
const auth = require("../middleware/auth");
const isVendor = require("../middleware/isVendor");
const upload = require("../middleware/multerProduct");
router.post(
  "/create",
  auth,
  isVendor,
  upload.array("images", 5),
  ProductContrroler.createProduct
);

router.get("/productes", ProductContrroler.allProucts);
router.get("/ArchivedProucts",  auth, isVendor,ProductContrroler.ArchivedProucts);
router.patch("/products/:id", auth, isVendor, ProductContrroler.updateProduct);
router.delete("/products/:id", auth, isVendor, ProductContrroler.deleteProduct);

module.exports = router;
