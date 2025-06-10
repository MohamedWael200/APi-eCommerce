const Cart = require('../models/Cart');
const Product = require('../models/Product');
const sanitize = require("sanitize-html");

const createCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    // التحقق من البيانات المطلوبة
    if (!productId || !quantity) {
      return res.status(400).json({
        message: "productId and quantity are required",
      });
    }

    // التحقق من صحة الكمية
    if (quantity <= 0) {
      return res.status(400).json({
        message: "Quantity must be greater than 0",
      });
    }

    // التحقق من وجود المنتج
    const product = await Product.findById(sanitize(productId));
    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // التحقق من المخزون
    if (product.stock < quantity) {
      return res.status(400).json({
        message: `Insufficient stock. Available: ${product.stock}`,
      });
    }

    // البحث عن سلة المستخدم الموجودة
    let cart = await Cart.findOne({ userId });

    if (cart) {
      // إذا كانت السلة موجودة، تحقق من وجود المنتج
      const existingItemIndex = cart.items.findIndex(
        item => item.productId.toString() === productId
      );

      if (existingItemIndex > -1) {
        // إذا كان المنتج موجود، زيادة الكمية
        const newQuantity = cart.items[existingItemIndex].quantity + parseInt(quantity);
        
        // تحقق من المخزون مرة أخرى
        if (product.stock < newQuantity) {
          return res.status(400).json({
            message: `Insufficient stock. Available: ${product.stock}, Requested: ${newQuantity}`,
          });
        }
        
        cart.items[existingItemIndex].quantity = newQuantity;
      } else {
        // إضافة منتج جديد للسلة
        cart.items.push({
          productId: sanitize(productId),
          quantity: parseInt(quantity),
        });
      }
    } else {
      // إنشاء سلة جديدة
      cart = new Cart({
        userId,
        items: [{
          productId: sanitize(productId),
          quantity: parseInt(quantity),
        }]
      });
    }

    await cart.save();

    // جلب تفاصيل السلة مع المنتجات والأسعار
    const populatedCart = await Cart.findById(cart._id)
      .populate({
        path: 'items.productId',
        select: 'name price images stock'
      });

    // حساب المجموع
    let totalPrice = 0;
    const cartWithPrices = populatedCart.items.map(item => {
      const itemTotal = item.productId.price * item.quantity;
      totalPrice += itemTotal;
      
      return {
        product: {
          _id: item.productId._id,
          name: item.productId.name,
          price: item.productId.price,
          images: item.productId.images,
        },
        quantity: item.quantity,
        itemTotal: itemTotal
      };
    });

    return res.status(200).json({
      message: "Product added to cart successfully",
      data: {
        cartId: cart._id,
        items: cartWithPrices,
        totalPrice: totalPrice,
        itemsCount: cart.items.length
      }
    });

  } catch (err) {
    console.error('Cart creation error:', err);
    return res.status(500).json({ 
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// دالة لجلب السلة مع الأسعار
const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId })
      .populate({
        path: 'items.productId',
        select: 'name price images stock isArchived'
      });

    if (!cart || cart.items.length === 0) {
      return res.status(200).json({
        message: "Cart is empty",
        data: {
          items: [],
          totalPrice: 0,
          itemsCount: 0
        }
      });
    }

    // تصفية المنتجات المحذوفة أو المؤرشفة
    const validItems = cart.items.filter(item => 
      item.productId && !item.productId.isArchived
    );

    // حساب المجموع
    let totalPrice = 0;
    const cartWithPrices = validItems.map(item => {
      const itemTotal = item.productId.price * item.quantity;
      totalPrice += itemTotal;
      
      return {
        _id: item._id,
        product: {
          _id: item.productId._id,
          name: item.productId.name,
          price: item.productId.price,
          images: item.productId.images,
          stock: item.productId.stock
        },
        quantity: item.quantity,
        itemTotal: itemTotal
      };
    });

    return res.status(200).json({
      message: "Cart retrieved successfully",
      data: {
        cartId: cart._id,
        items: cartWithPrices,
        totalPrice: totalPrice,
        itemsCount: validItems.length
      }
    });

  } catch (err) {
    console.error('Get cart error:', err);
    return res.status(500).json({ 
      message: "Internal server error" 
    });
  }
};



// حذف منتج من السلة
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    if (!productId) {
      return res.status(400).json({
        message: "Product ID is required",
        debug: {
          params: req.params,
          url: req.originalUrl
        }
      });
    }

    // البحث عن سلة المستخدم
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found"
      });
    }

    // البحث عن المنتج في السلة
    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        message: "Product not found in cart"
      });
    }

    // حذف المنتج من السلة
    cart.items.splice(itemIndex, 1);
    await cart.save();

    // إذا كانت السلة فارغة، يمكن حذفها (اختياري)
    if (cart.items.length === 0) {
      await Cart.findByIdAndDelete(cart._id);
      return res.status(200).json({
        message: "Product removed from cart successfully. Cart is now empty.",
        data: {
          items: [],
          totalPrice: 0,
          itemsCount: 0
        }
      });
    }

    // جلب السلة المحدثة مع الأسعار
    const updatedCart = await Cart.findById(cart._id)
      .populate({
        path: 'items.productId',
        select: 'name price images stock'
      });

    // حساب المجموع الجديد
    let totalPrice = 0;
    const cartWithPrices = updatedCart.items.map(item => {
      const itemTotal = item.productId.price * item.quantity;
      totalPrice += itemTotal;
      
      return {
        _id: item._id,
        product: {
          _id: item.productId._id,
          name: item.productId.name,
          price: item.productId.price,
          images: item.productId.images,
        },
        quantity: item.quantity,
        itemTotal: itemTotal
      };
    });

    return res.status(200).json({
      message: "Product removed from cart successfully",
      data: {
        cartId: cart._id,
        items: cartWithPrices,
        totalPrice: totalPrice,
        itemsCount: updatedCart.items.length
      }
    });

  } catch (err) {
    console.error('Remove from cart error:', err);
    return res.status(500).json({ 
      message: "Internal server error" 
    });
  }
};

// تعديل كمية منتج في السلة
const updateCartQuantity = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    // التحقق من البيانات المطلوبة
    if (!productId || quantity === undefined) {
      return res.status(400).json({
        message: "Product ID and quantity are required"
      });
    }

    // التحقق من صحة الكمية
    if (quantity < 0) {
      return res.status(400).json({
        message: "Quantity cannot be negative"
      });
    }

    // إذا كانت الكمية 0، احذف المنتج
    if (quantity === 0) {
      return removeFromCart({
        params: { productId },
        user: { id: userId }
      }, res);
    }

    // البحث عن سلة المستخدم
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found"
      });
    }

    // البحث عن المنتج في السلة
    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        message: "Product not found in cart"
      });
    }

    // التحقق من وجود المنتج والمخزون
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        message: `Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`
      });
    }

    // تحديث الكمية
    cart.items[itemIndex].quantity = parseInt(quantity);
    await cart.save();

    // جلب السلة المحدثة مع الأسعار
    const updatedCart = await Cart.findById(cart._id)
      .populate({
        path: 'items.productId',
        select: 'name price images stock'
      });

    // حساب المجموع الجديد
    let totalPrice = 0;
    const cartWithPrices = updatedCart.items.map(item => {
      const itemTotal = item.productId.price * item.quantity;
      totalPrice += itemTotal;
      
      return {
        _id: item._id,
        product: {
          _id: item.productId._id,
          name: item.productId.name,
          price: item.productId.price,
          images: item.productId.images,
        },
        quantity: item.quantity,
        itemTotal: itemTotal
      };
    });

    return res.status(200).json({
      message: "Cart quantity updated successfully",
      data: {
        cartId: cart._id,
        items: cartWithPrices,
        totalPrice: totalPrice,
        itemsCount: updatedCart.items.length
      }
    });

  } catch (err) {
    console.error('Update cart quantity error:', err);
    return res.status(500).json({ 
      message: "Internal server error" 
    });
  }
};
module.exports = {
  createCart,
  getCart,
  removeFromCart,
  updateCartQuantity
};