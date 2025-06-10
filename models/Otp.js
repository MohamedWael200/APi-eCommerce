const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const otpSchema = new Schema({
    email: { type: String, required: true },
    code: { type: String, required: true },
});

// استخدم الاتصال الافتراضي بدلاً من useDb
module.exports = mongoose.model("Otp", otpSchema);