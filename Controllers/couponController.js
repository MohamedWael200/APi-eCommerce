const Coupon = require("../models/Coupon");
const sanitize = require("sanitize-html");

const createCoupon = async (req, res) => {
  try {
    const { discountType, value, usageLimit, validFrom, validTo } =
      req.body;

    if (
      !discountType ||
      !value ||
      !usageLimit ||
      !validFrom ||
      !validTo
    ) {
      return res
        .status(400)
        .json({
          message:
            "discountType , value , usageLimit , validFrom and validTo are required",
        });
    }

    const generateRandomCode = () => {
        return Math.random().toString(36).substr(2, 8).toUpperCase(); // مثال: "A1B2C3D4"
      };

      if (new Date(validFrom) > new Date(validTo)) {
        return res.status(400).json({ message: "validFrom must be before validTo" });
      }
      
      
    const newCoupon = new Coupon({
        code : generateRandomCode(),
        discountType : sanitize(discountType),
        value : sanitize(value),
        usageLimit : sanitize(usageLimit),
        validFrom : sanitize(validFrom),
        validTo : sanitize(validTo),
    })

    await newCoupon.save();

    res
      .status(201)
      .json({ message: "Coupon created successfully", data: newCoupon });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create coupon", error: error.message });
  }
};



const GetAllCoupons = async (req, res) => {
    try {

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const skip = (page - 1) * limit;
      const TotlaCoupons = await Coupon.countDocuments();
      const coupons = await Coupon.find()
        .skip(skip)
        .limit(limit)
  
      if (!coupons || coupons.length === 0) {
        return res.status(404).json({ message: "No Coupons found" });
      }
  
      res.status(200).json({
        message: "Coupons fetched successfully",
        data: coupons,
        paination: {
          "Total Product": TotlaCoupons,
          Page: page,
        },
      });
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
  

module.exports = {
    createCoupon,
    GetAllCoupons
}