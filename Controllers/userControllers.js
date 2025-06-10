const User = require("../models/User")

const allUsers = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const skip = (page - 1) * limit;
  
      const filter = {};
  
      if (req.query.role) {
        filter.role = req.query.role;
      }
  
      if (req.query.status) {
        filter.status = req.query.status;
      }
  
      const countUser = await User.countDocuments(filter);
      const users = await User.find(filter).skip(skip).limit(limit);
  
      if (!users.length) {
        return res.json({ message: "There is no user matching the criteria..." });
      }
  
      res.status(200).json({
        message: "Users fetched successfully",
        data: users,
        pagination: {
          page,
          limit,
          totalUsers: countUser,
          totalPages: Math.ceil(countUser / limit),
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Fetching users failed", error: error.message });
    }
  };
  
  const userStatusBanned = async (req, res) => {
    try {
      const id = req.params.id;
  
      const user = await User.findById(id);
  
      if (!user) {
        return res.status(404).json({ message: "There is no user matching this ID..." });
      }
  
      // تحديث الحالة
      user.status = "banned";
      await user.save();
  
      res.status(200).json({ message: "User has been banned successfully", data: user });
    } catch (error) {
      res.status(500).json({ message: "Failed to ban user", error: error.message });
    }
  };

  
const userStatusActive = async (req , res) => {
    try {
        const id = req.params.id;

        const user = await User.findById(id);
  
        if (!user) {
          return res.status(404).json({ message: "There is no user matching this ID..." });
        }
  
        user.status = "active";
        await user.save();
        res.status(200).json({ message: "User has been Active successfully", data: user });

    } catch (error) {
        res.status(500).json({ message: "Failed to ban user", error: error.message });
    }
}



const userRoleAdminToVendor = async (req , res) => {
    try {
        const id = req.params.id;

        const user = await User.findById(id);
  
        if (!user) {
          return res.status(404).json({ message: "There is no user matching this ID..." });
        }
  
        user.role = "vendor";
        await user.save();
        res.status(200).json({ message: "Admin has been Vendor successfully", data: user });

    } catch (error) {
        res.status(500).json({ message: "Failed to ban user", error: error.message });
    }
}
module.exports = {
    allUsers,
    userStatusBanned,
    userStatusActive,
    userRoleAdminToVendor,
}