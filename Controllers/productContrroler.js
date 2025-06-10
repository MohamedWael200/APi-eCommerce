const Product = require("../models/Product");
const sanitize = require("sanitize-html");

const createProduct = async (req, res) => {
  try {
    const { name, description, price, categoryId, stock } = req.body;

    if (!name || !description || !price || !categoryId || !stock) {
      return res.status(400).json({
        message: "Name , description , price , categoryId  And  are required",
      });
    }

    const newProduct = new Product({
      name: sanitize(name),
      description: sanitize(description),
      price: sanitize(price),
      categoryId: sanitize(categoryId),
      stock: sanitize(stock),
      images: req.files ? req.files.map((file) => file.path) : [],
      vendorId: req.user.id, // ✅ جلب الـ vendorId من التوكن
    });

    await newProduct.save();
    return res
      .status(200)
      .json({ message: "Product Save Scussefully", data: newProduct });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const allProucts = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const skip = (page - 1) * limit;
      const searchKey = req.query.name || "";
      const TotlaProduct = await Product.countDocuments({isArchived: false});
      const products = await Product.find({
        isArchived: false,
        name: { $regex: searchKey, $options: "i" },
      })
        .skip(skip)
        .limit(limit)
        .populate("categoryId" , "name")
        .populate("vendorId", "name");
  
      if (!products || products.length === 0) {
        return res.status(404).json({ message: "No products found" });
      }
  
      res.status(200).json({
        message: "Products fetched successfully",
        data: products,
        paination : {
            "Total Product" : TotlaProduct,
            "Page" : page
        }
      });
    } catch (err) {
      console.error("Error in allProducts:", err.message);
      return res
        .status(500)
        .json({ message: "Failed to fetch products", error: err.message });
    }
  };
  
  const updateProduct = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, price, categoryId, stock } = req.body;
  
      // ✅ تأكد من وجود المنتج
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
  
      // ✅ تحقق إن صاحب المنتج هو اللي بيعدله
      if (product.vendorId.toString() !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
  
      // ✅ تحديث الحقول
      product.name = sanitize(name) || product.name;
      product.description = sanitize(description) || product.description;
      product.price = sanitize(price) || product.price;
      product.categoryId = sanitize(categoryId) || product.categoryId;
      product.stock = sanitize(stock) || product.stock;
  
      await product.save();
  
      res.status(200).json({ message: "Product updated", data: product });
    } catch (err) {
      res.status(500).json({ message: "Failed to update product", error: err.message });
    }
  };
  

  const deleteProduct = async (req, res) => {
    try {
      const { id } = req.params;
  
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
  
      // ✅ تحقق إنه البائع صاحب المنتج
      if (product.vendorId.toString() !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
  
      product.isArchived = true;
      await product.save();
  
      res.status(200).json({ message: "Product archived successfully" });
    } catch (err) {
      res.status(500).json({ message: "Failed to archive product", error: err.message });
    }
  };
  

  
const ArchivedProucts = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const skip = (page - 1) * limit;
      const searchKey = req.query.name || "";
      const TotlaProduct = await Product.countDocuments({isArchived: true});
      const products = await Product.find({
        isArchived: true,
        name: { $regex: searchKey, $options: "i" },
      })
        .skip(skip)
        .limit(limit)
        .populate("categoryId" , "name")
        .populate("vendorId", "name");
  
      if (!products || products.length === 0) {
        return res.status(404).json({ message: "No products found" });
      }
  
      res.status(200).json({
        message: "Products fetched successfully",
        data: products,
        paination : {
            "Total Product" : TotlaProduct,
            "Page" : page
        }
      });
    } catch (err) {
      console.error("Error in allProducts:", err.message);
      return res
        .status(500)
        .json({ message: "Failed to fetch products", error: err.message });
    }
  };
module.exports = {
  createProduct,
  allProucts,
  updateProduct,
  deleteProduct,
  ArchivedProucts
};
