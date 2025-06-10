const Category = require("../models/Category");
const sanitize = require("sanitize-html");

const createCategory = async (req, res) => {
  try {
    const { name, slug, parentCategory } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ message: "Name and Slug are required" });
    }

    // لو فيه parentCategory، تأكد إنه موجود
    if (parentCategory) {
      const parent = await Category.findById(parentCategory);
      if (!parent) {
        return res.status(400).json({ message: "Invalid parent category ID" });
      }
    }

    const newCategory = new Category({
      name: sanitize(name),
      slug: sanitize(slug),
      parentCategory: parentCategory || null,
    });

    await newCategory.save();

    res
      .status(201)
      .json({ message: "Category created successfully", data: newCategory });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create category", error: error.message });
  }
};

const getAllCategories = async (req, res) => {
  try {
    // جيب التصنيفات الرئيسية فقط
    const mainCategories = await Category.find({ parentCategory: null }).lean();

    // لكل تصنيف، جيب السابكاتيجوريز المرتبطة
    const result = await Promise.all(
      mainCategories.map(async (cat) => {
        const subcategories = await Category.find({
          parentCategory: cat._id,
          isDeleted: false,
        }).lean();
        return { ...cat, subcategories };
      })
    );

    res
      .status(200)
      .json({ message: "Categories fetched successfully", data: result });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch categories", error: error.message });
  }
};

const updateCategory = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, slug } = req.body;
  
      if (!name && !slug) {
        return res.status(400).json({ message: "At least name or slug is required" });
      }
  
      const updates = {};
  
      if (name) updates.name = sanitize(name);
      if (slug) updates.slug = sanitize(slug);
  
      const updated = await Category.findByIdAndUpdate(id, updates, { new: true });
  
      if (!updated) {
        return res.status(404).json({ message: "Category not found" });
      }
  
      res.status(200).json({ message: "Category updated successfully", data: updated });
    } catch (error) {
      res.status(500).json({ message: "Failed to update category", error: error.message });
    }
  };
  
  const deleteCategory = async (req, res) => {
    try {
      const { id } = req.params;
  
      const deleted = await Category.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      );
  
      if (!deleted) {
        return res.status(404).json({ message: "Category not found" });
      }
  
      res.status(200).json({ message: "Category soft-deleted successfully", data: deleted });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category", error: error.message });
    }
  };
  
  
  const restoreCategory = async (req , res) => {
    try {
        const id = req.params.id;

        const categories = await Category.findById(id);
  
        if (!categories) {
          return res.status(404).json({ message: "There is no user matching this ID..." });
        }
  
        categories.isDeleted = "false";
        await categories.save();
        res.status(200).json({ message: "Category has been Restore successfully", data: categories });

    } catch (error) {
        res.status(500).json({ message: "Failed to Restore Category", error: error.message });
    }
}


const getAllDeletedCategories = async (req, res) => {
    try {
      // جيب التصنيفات الرئيسية المحذوفة فقط
      const mainCategories = await Category.find({
        parentCategory: null,
        isDeleted: true,
      }).lean();
  
      // لكل تصنيف، جيب السابكاتيجوريز المحذوفة فقط
      const result = await Promise.all(
        mainCategories.map(async (cat) => {
          const subcategories = await Category.find({
            parentCategory: cat._id,
            isDeleted: true,
          }).lean();
          return { ...cat, subcategories };
        })
      );
  
      res.status(200).json({
        message: "Deleted categories fetched successfully",
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to fetch deleted categories",
        error: error.message,
      });
    }
  };
  

module.exports = {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
  restoreCategory,
  getAllDeletedCategories,
};
