const { config } = require("dotenv");
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const authRoute = require("./Routes/authRoute");
const userRoute = require("./Routes/userRoute");
const categoryRoute = require("./Routes/categoryRoute");
const productRoute = require("./Routes/productRoute");
const cartRoute = require("./Routes/cartRoute");
const orderRoutes = require('./Routes/orderRoute');
const reviewRoutes = require('./Routes/reviewRoute');
const dashboardRoutes = require('./Routes/dashboardRoute');
const couponRoutes = require('./Routes/couponRoute');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

app.use("/" , authRoute)
app.use("/" , userRoute)
app.use("/category" , categoryRoute)
app.use("/product" , productRoute)
app.use("/cart" , cartRoute)
app.use('/orders', orderRoutes);
app.use('/reviews', reviewRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/coupon', couponRoutes);

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("Database connected successfully!");
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}/`);
        });
    })
    .catch((err) => {
        console.error("Database connection failed:", err);
    });
