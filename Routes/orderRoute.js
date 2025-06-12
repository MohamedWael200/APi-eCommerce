const express = require("express");
const {
  createOrder,
  getOrders,
  updateOrderStatus,
  confirmPayPalPayment,
  cancelPayPalPayment,
  getOneOrder,
  AdminAll,
  VendorAllOrders
} = require("../Controllers/orderContrroler");
const limiter = require("../middleware/Limiter")


const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const isVendor = require("../middleware/isVendor");

const router = express.Router();


router.use(limiter);

// إنشاء طلب جديد - العملاء فقط
router.post("/create", auth, createOrder);

// جلب الطلبات - جميع المستخدمين المسجلين
router.get("/", auth, getOrders);

// تحديث حالة الطلب - البائع والأدمن فقط
router.patch("/:id/status", auth, isVendor, updateOrderStatus);

// جلب طلب واحد بالتفصيل
router.get("/:id", auth, getOneOrder);

// routes خاصة بالأدمن فقط
router.get("/admin/all", auth, isAdmin, AdminAll);

// routes خاصة بالبائع فقط
router.get("/vendor/my-orders", auth, isVendor, VendorAllOrders);

// ========== PayPal Routes - مهمة جداً ==========
// تأكيد دفع PayPal
router.get("/paypal/success", confirmPayPalPayment);

// إلغاء دفع PayPal
router.get("/paypal/cancel", cancelPayPalPayment);

module.exports = router;