const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discountType: {
    type: String,
    enum: ["percentage", "fixed"],
    required: true
  },
  value: { type: Number, required: true },
  usageLimit: { type: Number, default: 1 },
  validFrom: { type: Date, required: true },
  validTo: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Coupon", couponSchema);
