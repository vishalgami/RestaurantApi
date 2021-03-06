const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: String,
    password: String,
    name: String,
    role: String
},{ collection: "users"});

module.exports = UserSchema;