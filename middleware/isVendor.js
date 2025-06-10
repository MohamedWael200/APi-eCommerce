const isAdmin = (req , res , next) => {
    if(req.user.role != "vendor") {
        return res.status(403).json({ message: "Access denied. vendor only." });
    }
    next();
};

module.exports = isAdmin;