const Review = require("../models/Review");
const Product = require("../models/Product");
const sanitize = require("sanitize-html");

const createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    if (!productId || !rating || !comment) {
      return res.status(400).json({
        message: "productId , rating  And comment are required",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(400).json({
        message: "There is no product with this name.",
      });
    }

    if (rating > 5 || rating < 0) {
      return res.status(400).json({
        message: "Rating Must Betwween 0 And 5",
      });
    }

    const newReview = new Review({
      userId: req.user.id,
      productId: sanitize(productId),
      rating: sanitize(rating),
      comment: sanitize(comment),
    });

    await newReview.save();
    return res
      .status(200)
      .json({ message: "Review Save Scussefully", data: newReview });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const reviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    const TotlaReviews = await Review.countDocuments();
    const reviews = await Review.find()
      .skip(skip)
      .limit(limit)
      .populate("userId", "name")
      .populate("productId", "name");

    if (!reviews || reviews.length === 0) {
      return res.status(404).json({ message: "No reviews found" });
    }

    res.status(200).json({
      message: "reviews fetched successfully",
      data: reviews,
      paination: {
        "Total Product": TotlaReviews,
        Page: page,
      },
    });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const DeleteReviews = async (req, res) => {
  try {
    const id = req.params.id;
    const reviews = await Review.findByIdAndDelete(id);

    if(!reviews) {
        return res.status(400).json({ message: "No reviews found" });
    }

    return res
      .status(200)
      .json({ message: "Review Delete Scussefully", data: reviews });

  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = {
  createReview,
  reviews,
  DeleteReviews,
};
