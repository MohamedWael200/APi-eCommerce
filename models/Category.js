const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Category", categorySchema);
