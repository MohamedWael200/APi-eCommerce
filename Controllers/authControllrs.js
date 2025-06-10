const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const sanitize = require("sanitize-html");
const Otp = require("../models/Otp");
const sendEmail = require("../utils/SendEmail");
const register = async (req, res) => {
    try {
      const { name, email, password, role = "customer" } = req.body;
  
      if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }
  
      if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Invalid email" });
      }
  
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
  
      // 💡 لو الدور هو admin أو vendor، لازم التوكن يكون موجود والشخص يكون admin
      if (role === "admin") {
        const existingAdmin = await User.findOne({ role: "admin" });
        if (existingAdmin) {
          const token = req.header("Authorization")?.split(" ")[1];
          if (!token) {
            return res
              .status(403)
              .json({ message: "Token required to register this role" });
          }
  
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            if (decoded.role !== "admin") {
              return res
                .status(403)
                .json({ message: "Only admins can register this role" });
            }
          } catch (err) {
            return res.status(401).json({ message: "Invalid or expired token" });
          }
        }
      }
  
      if (role === "vendor") {
        const token = req.header("Authorization")?.split(" ")[1];
        if (!token) {
          return res
            .status(403)
            .json({ message: "Token required to register this role" });
        }
  
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
          if (decoded.role !== "admin") {
            return res
              .status(403)
              .json({ message: "Only admins can register this role" });
          }
        } catch (err) {
          return res.status(401).json({ message: "Invalid or expired token" });
        }
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const newUser = new User({
        name: sanitize(name),
        email: sanitize(email),
        password: hashedPassword,
        profileImage: req.file ? req.file.path : "",
        role: sanitize(role),
      });
  
      await newUser.save();
  
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      await new Otp({ email, code: otpCode }).save();
  
      // ✅ حطينا الـ html هنا قبل الاستخدام
      const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
          <h2 style="color: #2c3e50; text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
              E-commerce Platform Verification
          </h2>
          
          <p style="font-size: 16px; color: #333;">
              Hello ${sanitize(name)},
          </p>
          
          <p style="font-size: 15px; color: #555;">
              Your verification code is:
          </p>
          
          <div style="background-color: #ffffff; border-radius: 6px; padding: 15px; text-align: center; margin: 20px 0; font-size: 24px; font-weight: bold; color: #2c3e50; border: 1px dashed #3498db;">
              ${otpCode}
          </div>
          
          <p style="font-size: 14px; color: #777;">
              This code will expire in 10 minutes. Please do not share it with anyone.
          </p>
          
          <div style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
              <p>If you didn't request this code, please ignore this email.</p>
              <p>© ${new Date().getFullYear()} E-commerce Platform. All rights reserved.</p>
          </div>
      </div>
      `;
      
      await sendEmail(email, "Your Verification Code", "", html);
  
      return res.status(200).json({
        message: "User registered successfully. Please verify your email.",
        data: newUser,
      });
    } catch (error) {
      console.log("Register Error:", error);
      res
        .status(500)
        .json({ message: "Registration failed", error: error.message });
    }
  };
  

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(500).json({ message: "No email Such As This Email" });
    }

    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Account not verified. Please verify via OTP." });
    }

    const mathPassword = await bcrypt.compare(password, user.password);

    if (!mathPassword) {
      return res.status(400).json({ message: "Password is incorrect" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET_KEY,
      {}
    );

    return res
      .status(200)
      .json({ message: "Login successful", token, data: user });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

const verifyToken = async (req, res) => {
  try {
    const { email, code } = req.body;
    const otpRecord = await Otp.findOne({ email, code });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // ✅ تفعيل الحساب
    await User.updateOne({ email }, { $set: { isVerified: true } });
    await Otp.deleteMany({ email }); // نحذف الـ OTP بعد التفعيل

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Registration failed", error: err.message });
  }
};

module.exports = {
  register,
  login,
  verifyToken,
};
