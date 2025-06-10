const express = require("express");
const router = express.Router();
const cartContrroler =  require("../Controllers/cartContrroler");
const auth = require("../middleware/auth");

router.post("/create", auth , cartContrroler.createCart)
router.get("/cart" , auth , cartContrroler.getCart)
router.delete('/remove/:productId', auth, cartContrroler.removeFromCart);
router.patch('/update', auth, cartContrroler.updateCartQuantity);
module.exports = router;