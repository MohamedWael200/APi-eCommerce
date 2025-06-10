const multer = require("multer");
const path = require("path");

// إعدادات التخزين
const storage = multer.diskStorage({
  destination: "uploads/users", // مكان حفظ الصورة
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});


// رفع الملف
const upload = multer({ storage });

module.exports = upload;
