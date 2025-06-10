const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name : { type : String, required : true },
    email : { type : String, required : true },
    password : { type : String, required : true },
    role : { type : String, enum : ["user", "vendor" ,"admin"], default : "user" },
    isVerified : { type : Boolean, default : false },
    status : {type : String, enum : ["active", "banned"], default : "active"},
    profileImage : { type : String, default : null },
} , { timestamps : true });

module.exports = mongoose.model("User", userSchema);