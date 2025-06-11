const express = require("express");
const router = express.Router();
const reviewContrroler =  require("../Controllers/reviewControllers");
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");

router.post("/create" ,auth  , reviewContrroler.createReview)
router.get("/reviews" ,auth  , reviewContrroler.reviews)
router.delete("/delete/:id" ,auth  , isAdmin , reviewContrroler.DeleteReviews)

module.exports = router;