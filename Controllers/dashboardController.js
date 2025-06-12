const User = require("../models/User");
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Category = require("../models/Category");
const Order = require('../models/Order');

const dashboard = async (req , res) => {
    try {

        const users = await User.find({role : "user"})
        const totoalusers = await User.find({role : "user"}).countDocuments();
        const vendor = await User.find({role : "vendor"})
        const totalvendor = await User.find({role : "vendor"}).countDocuments();
        const admin = await User.find({role : "admin"})
        const totaladmin = await User.find({role : "admin"}).countDocuments();

        const category = await Category.find()
        const totoalcategorys = await Category.find().countDocuments();

        const products = await Product.find()
        const totoalproducts = await Product.find().countDocuments();

        const orders = await Order.find()
        const totalorders = await Order.find().countDocuments();

        res.status(200).json({
            message: "Dashboard fetched successfully",
            users: {
                users : users,
                totalUser : totoalusers,
            },
            vendor : {
                vendor : vendor,
                TotalVendor :totalvendor,
            },
            admin : {
                admin : admin,
                TotalAdmin :totaladmin
            },
            category : {
                category : category,
                TotalCategory :totoalcategorys
            },
            products : {
                products : products,
                TotalProducts : totoalproducts
            },
            orders : {
                orders :orders,
                TotalOrders : totalorders
            }
          });
    } catch (error) {
        res
          .status(500)
          .json({ message: "Failed to fetched users", error: error.message });
    }
}


const vendorDashoard = async (req, res) => {
    try {
        const vendorID = req.user.id;

        // تاريخ بداية الشهر الحالي
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // المنتجات
        const [products, totalProducts] = await Promise.all([
            Product.find({ vendorId: vendorID }),
            Product.countDocuments({ vendorId: vendorID })
        ]);

        // الطلبات خلال هذا الشهر
        const orders = await Order.find({
            vendorId: vendorID,
            createdAt: { $gte: startOfMonth }
        });

        const totalOrders = await Order.countDocuments({
            vendorId: vendorID,
            createdAt: { $gte: startOfMonth }
        });

        // حساب الأرباح
        let monthlyProfit = 0;
        orders.forEach(order => {
            order.items.forEach(item => {
                monthlyProfit += item.price * item.quantity;
            });
        });

        res.status(200).json({
            message: "Dashboard fetched successfully",
            products: {
                products: products,
                totalProducts: totalProducts
            },
            orders: {
                orders: orders,
                totalOrders: totalOrders
            },
            monthlyProfit: monthlyProfit.toFixed(2) + " USD"
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch dashboard",
            error: error.message
        });
    }
};



module.exports = {
    dashboard,
    vendorDashoard
}