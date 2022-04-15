const dotenv = require("dotenv");
const result = dotenv.config();
const username = process.env.USER;
const password = process.env.PASS;
const database = process.env.DATABASE;

module.exports = {
    url: "mongodb+srv://"+username+":"+password+"@cluster0.dc0fv.mongodb.net/"+database+"?retryWrites=true&w=majority"
};