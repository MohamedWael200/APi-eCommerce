const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const sanitize = require("sanitize-html");
const Coupon = require('../models/Coupon');

// إنشاء طلب جديد
const createOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod = 'cash' , couponCode } = req.body;
    const userId = req.user.id;

   let appliedCoupon = null;
if (couponCode) {
  appliedCoupon = await Coupon.findOne({ code: couponCode });

  if (
    !appliedCoupon || 
    appliedCoupon.usageLimit <= 0 || 
    new Date() < new Date(appliedCoupon.validFrom) || 
    new Date() > new Date(appliedCoupon.validTo)
  ) {
    return res.status(400).json({
      message: "Invalid or expired coupon"
    });
  }
}
    // التحقق من البيانات المطلوبة
    if (!shippingAddress) {
      return res.status(400).json({
        message: "Shipping address is required"
      });
    }

    // التحقق من paymentMethod الصحيح - يجب أن يتطابق مع الـ schema
    const validPaymentMethods = ['cash', 'card', 'paypal', 'stripe', 'bank_transfer'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        message: `Invalid payment method. Valid options: ${validPaymentMethods.join(', ')}`
      });
    }

    // جلب السلة
    const cart = await Cart.findOne({ userId })
      .populate({
        path: 'items.productId',
        select: 'name price stock vendorId isArchived'
      });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        message: "Cart is empty"
      });
    }

    // التحقق من المنتجات والمخزون
    const orderItems = [];
    let totalAmount = 0;
    const vendorIds = new Set();

    for (const item of cart.items) {
      const product = item.productId;
      
      if (!product || product.isArchived) {
        return res.status(400).json({
          message: `Product ${product?.name || 'Unknown'} is no longer available`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      vendorIds.add(product.vendorId.toString());

      orderItems.push({
        productId: product._id,
        quantity: item.quantity,
        price: product.price
      });

      // خصم من المخزون فقط إذا لم يكن الدفع PayPal
      // لأن PayPal قد يفشل، وسنخصم بعد تأكيد الدفع
      if (paymentMethod !== 'paypal') {
        product.stock -= item.quantity;
        await product.save();
      }
    }

    // إنشاء رقم الطلب
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const vendorId = vendorIds.size === 1 ? Array.from(vendorIds)[0] : null;

    // تحديد حالة الدفع المناسبة
    let paymentStatus = 'unpaid';
    if (paymentMethod === 'paypal') {
      paymentStatus = 'pending';
    } else if (paymentMethod === 'cash') {
      paymentStatus = 'unpaid';
    }

    console.log('Creating order with:', {
      paymentMethod,
      paymentStatus,
      totalAmount,
      orderNumber
    });

    // إنشاء الطلب
    const newOrder = new Order({
      userId,
      vendorId,
      items: orderItems,
      totalAmount,
      shippingAddress: sanitize(shippingAddress),
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus,
      orderNumber,
      status: 'pending'
    });

    await newOrder.save();
    console.log('Order saved successfully:', newOrder._id);

    // مسح السلة فقط إذا لم يكن PayPal
    if (paymentMethod !== 'paypal') {
      await Cart.findByIdAndDelete(cart._id);
      console.log('Cart deleted for non-PayPal payment');
    }

    // جلب الطلب مع التفاصيل
    const populatedOrder = await Order.findById(newOrder._id)
      .populate('userId', 'name email phone')
      .populate('vendorId', 'name email')
      .populate({
        path: 'items.productId',
        select: 'name images categoryId'
      });

    // إنشاء رابط الدفع للـ PayPal
    let paymentUrl = null;
    if (paymentMethod === 'paypal') {
      try {
        console.log('Creating PayPal payment for order:', newOrder._id);
        paymentUrl = await createPayPalPayment(newOrder);
        console.log('PayPal payment URL created:', paymentUrl);
      } catch (error) {
        console.error('PayPal payment creation failed:', error);
        // في حالة فشل إنشاء رابط PayPal، احذف الطلب
        await Order.findByIdAndDelete(newOrder._id);
        return res.status(500).json({
          message: "Failed to create PayPal payment link",
          error: error.message
        });
      }
    }

    return res.status(201).json({
      message: "Order created successfully",
      data: {
        order: populatedOrder,
        paymentUrl: paymentUrl
      }
    });

  } catch (err) {
    console.error('Create order error:', err);
    
    // إضافة تفاصيل أكثر للأخطاء
    if (err.name === 'ValidationError') {
      const errors = Object.keys(err.errors).map(key => ({
        field: key,
        message: err.errors[key].message,
        value: err.errors[key].value
      }));
      
      return res.status(400).json({
        message: "Validation failed",
        errors: errors
      });
    }
    
    return res.status(500).json({ 
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// إنشاء دفع PayPal - محسن
const createPayPalPayment = async (order) => {
  try {
    console.log('Starting PayPal payment creation...');
    
    const paypal = require('paypal-rest-sdk');
    
    // التحقق من المتغيرات البيئية
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      throw new Error('PayPal credentials not configured in environment variables');
    }
    
    console.log('PayPal Configuration:', {
      mode: process.env.PAYPAL_MODE || 'sandbox',
      client_id: process.env.PAYPAL_CLIENT_ID ? 'Set' : 'Not Set',
      client_secret: process.env.PAYPAL_CLIENT_SECRET ? 'Set' : 'Not Set',
      base_url: process.env.BASE_URL
    });
    
    // إعداد PayPal بالمعلومات الصحيحة
    paypal.configure({
      'mode': process.env.PAYPAL_MODE || 'sandbox',
      'client_id': process.env.PAYPAL_CLIENT_ID,
      'client_secret': process.env.PAYPAL_CLIENT_SECRET
    });

    const create_payment_json = {
      "intent": "sale",
      "payer": {
        "payment_method": "paypal"
      },
      "redirect_urls": {
        "return_url": `${process.env.BASE_URL}/orders/paypal/success?orderId=${order._id}`,
        "cancel_url": `${process.env.BASE_URL}/orders/paypal/cancel?orderId=${order._id}`
      },
      "transactions": [{
        "item_list": {
          "items": order.items.map(item => ({
            "name": item.productId?.name || "Product",
            "sku": item.productId?._id?.toString() || "N/A",
            "price": item.price.toFixed(2),
            "currency": "USD",
            "quantity": item.quantity
          }))
        },
        "amount": {
          "currency": "USD",
          "total": order.totalAmount.toFixed(2)
        },
        "description": `Order ${order.orderNumber}`,
        "custom": JSON.stringify({
          orderId: order._id,
          userId: order.userId
        })
      }]
    };

    console.log('PayPal payment request:', JSON.stringify(create_payment_json, null, 2));

    return new Promise((resolve, reject) => {
      paypal.payment.create(create_payment_json, (error, payment) => {
        if (error) {
          console.error('PayPal payment creation error:', JSON.stringify(error, null, 2));
          reject(new Error(`PayPal Error: ${error.message || 'Unknown error'}`));
        } else {
          console.log('PayPal payment created successfully:', payment.id);
          const approvalUrl = payment.links.find(link => link.rel === 'approval_url');
          if (approvalUrl) {
            console.log('Approval URL found:', approvalUrl.href);
            resolve(approvalUrl.href);
          } else {
            console.error('No approval URL found in PayPal response');
            console.log('PayPal response links:', payment.links);
            reject(new Error('No approval URL found in PayPal response'));
          }
        }
      });
    });

  } catch (err) {
    console.error('PayPal payment creation error:', err);
    throw err;
  }
};

// تأكيد دفع PayPal - محسن
const confirmPayPalPayment = async (req, res) => {
  try {
    const { paymentId, PayerID, orderId } = req.query;

    console.log('PayPal confirmation params:', { paymentId, PayerID, orderId });

    if (!paymentId || !PayerID || !orderId) {
      return res.status(400).json({
        message: "Missing payment parameters",
        received: { paymentId: !!paymentId, PayerID: !!PayerID, orderId: !!orderId }
      });
    }

    const paypal = require('paypal-rest-sdk');

    // إعداد PayPal
    paypal.configure({
      'mode': process.env.PAYPAL_MODE || 'sandbox',
      'client_id': process.env.PAYPAL_CLIENT_ID,
      'client_secret': process.env.PAYPAL_CLIENT_SECRET
    });

    // جلب الطلب أولاً
    const order = await Order.findById(orderId).populate({
      path: 'items.productId',
      select: 'name price stock'
    });
    
    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    const execute_payment_json = {
      "payer_id": PayerID,
      "transactions": [{
        "amount": {
          "currency": "USD",
          "total": order.totalAmount.toFixed(2)
        }
      }]
    };

    console.log('Executing PayPal payment:', execute_payment_json);

    paypal.payment.execute(paymentId, execute_payment_json, async (error, payment) => {
      if (error) {
        console.error('PayPal execution error:', error);
        
        // في حالة فشل الدفع، احذف الطلب
        await Order.findByIdAndDelete(orderId);
        console.log('Order deleted due to payment failure');

        return res.status(400).json({
          message: "Payment execution failed",
          error: error.message
        });
      } else {
        console.log('PayPal payment executed successfully:', payment.id);
        
        // خصم من المخزون بعد تأكيد الدفع
        for (const item of order.items) {
          const product = await Product.findById(item.productId);
          if (product) {
            product.stock -= item.quantity;
            await product.save();
            console.log(`Stock updated for product ${product.name}: ${product.stock}`);
          }
        }

        // مسح السلة بعد تأكيد الدفع
        await Cart.findOneAndDelete({ userId: order.userId });
        console.log('Cart deleted after successful payment');

        // تحديث حالة الدفع والطلب
        order.paymentStatus = 'paid';
        order.status = 'confirmed';
        order.paymentDetails = {
          paymentId: payment.id,
          payerId: payment.payer.payer_info.payer_id,
          paymentMethod: 'paypal',
          amount: payment.transactions[0].amount.total,
          currency: payment.transactions[0].amount.currency,
          transactionId: payment.transactions[0].related_resources[0].sale.id
        };
        await order.save();
        console.log('Order updated with payment details');

        // إرجاع نجاح الدفع
        return res.status(200).json({
          message: "Payment completed successfully",
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            paymentId: payment.id,
            amount: payment.transactions[0].amount.total,
            status: order.status,
            paymentStatus: order.paymentStatus
          }
        });
      }
    });

  } catch (err) {
    console.error('Confirm PayPal payment error:', err);
    return res.status(500).json({ 
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// إلغاء الدفع PayPal
const cancelPayPalPayment = async (req, res) => {
  try {
    const { orderId } = req.query;

    console.log('PayPal payment cancelled for order:', orderId);

    if (orderId) {
      // احذف الطلب في حالة الإلغاء
      const order = await Order.findById(orderId);
      if (order) {
        await Order.findByIdAndDelete(orderId);
        console.log('Order deleted due to payment cancellation');
      }
    }

    return res.status(200).json({
      message: "Payment was cancelled",
      data: { orderId }
    });

  } catch (err) {
    console.error('Cancel PayPal payment error:', err);
    return res.status(500).json({ 
      message: "Internal server error" 
    });
  }
};

// باقي الكود يبقى كما هو...
const getOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, page = 1, limit = 10 } = req.query;

    let filter = {};
    
    if (userRole === 'customer') {
      filter.userId = userId;
    } else if (userRole === 'vendor') {
      filter.$or = [
        { vendorId: userId },
        { 'items.productId': { $in: await getVendorProducts(userId) } }
      ];
    }

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(filter)
      .populate('userId', 'name email phone')
      .populate('vendorId', 'name email')
      .populate({
        path: 'items.productId',
        select: 'name images price categoryId'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalOrders = await Order.countDocuments(filter);

    return res.status(200).json({
      message: "Orders retrieved successfully",
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
          limit: parseInt(limit)
        }
      }
    });

  } catch (err) {
    console.error('Get orders error:', err);
    return res.status(500).json({ 
      message: "Internal server error" 
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'canceled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Valid options: ${validStatuses.join(', ')}`
      });
    }

    const order = await Order.findById(id)
      .populate({
        path: 'items.productId',
        select: 'vendorId'
      });

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    let canUpdate = false;
    
    if (userRole === 'admin') {
      canUpdate = true;
    } else if (userRole === 'vendor') {
      const isVendorOrder = order.vendorId?.toString() === userId || 
                           order.items.some(item => item.productId?.vendorId?.toString() === userId);
      canUpdate = isVendorOrder;
    }

    if (!canUpdate) {
      return res.status(403).json({
        message: "You don't have permission to update this order"
      });
    }

    order.status = status;
    await order.save();

    if (status === 'canceled') {
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }
    }

    const updatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email phone')
      .populate('vendorId', 'name email')
      .populate({
        path: 'items.productId',
        select: 'name images price'
      });

    return res.status(200).json({
      message: "Order status updated successfully",
      data: updatedOrder
    });

  } catch (err) {
    console.error('Update order status error:', err);
    return res.status(500).json({ 
      message: "Internal server error" 
    });
  }
};

const getVendorProducts = async (vendorId) => {
  const products = await Product.find({ vendorId }, '_id');
  return products.map(p => p._id);
};

const getOneOrder = async(req , res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
    
        let filter = { _id: id };
        
        if (userRole === 'customer') {
          filter.userId = userId;
        } else if (userRole === 'vendor') {
          filter.$or = [
            { vendorId: userId },
            { 'items.productId': { $in: await getVendorProducts(userId) } }
          ];
        }
    
        const order = await Order.findOne(filter)
          .populate('userId', 'name email phone')
          .populate('vendorId', 'name email')
          .populate({
            path: 'items.productId',
            select: 'name images price categoryId'
          });
    
        if (!order) {
          return res.status(404).json({
            message: "Order not found"
          });
        }
    
        res.status(200).json({
          message: "Order retrieved successfully",
          data: order
        });
    
      } catch (err) {
        console.error('Get single order error:', err);
        res.status(500).json({ message: "Internal server error" });
      }
}

const AdminAll = async (req , res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        
        let filter = {};
        if (status) filter.status = status;
    
        const skip = (page - 1) * limit;
        
        const orders = await Order.find(filter)
          .populate('userId', 'name email')
          .populate('vendorId', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit));
    
        const totalOrders = await Order.countDocuments(filter);
    
        res.status(200).json({
          message: "All orders retrieved successfully",
          data: {
            orders,
            pagination: {
              currentPage: parseInt(page),
              totalPages: Math.ceil(totalOrders / limit),
              totalOrders,
              limit: parseInt(limit)
            }
          }
        });
    
      } catch (err) {
        console.error('Admin get all orders error:', err);
        res.status(500).json({ message: "Internal server error" });
      }
}

const VendorAllOrders = async (req , res) => {
    try {
        const vendorId = req.user.id;
        
        const vendorProducts = await Product.find({ vendorId }, '_id');
        const productIds = vendorProducts.map(p => p._id);
    
        const orders = await Order.find({
          $or: [
            { vendorId },
            { 'items.productId': { $in: productIds } }
          ]
        })
        .populate('userId', 'name email phone')
        .populate({
          path: 'items.productId',
          select: 'name images price'
        })
        .sort({ createdAt: -1 });
    
        res.status(200).json({
          message: "Vendor orders retrieved successfully", 
          data: orders
        });
    
      } catch (err) {
        console.error('Vendor get orders error:', err);
        res.status(500).json({ message: "Internal server error" });
      }
}

module.exports = {
  createOrder,
  getOrders,
  updateOrderStatus,
  confirmPayPalPayment,
  cancelPayPalPayment,
  getOneOrder,
  AdminAll,
  VendorAllOrders
};