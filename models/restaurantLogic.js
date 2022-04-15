const mongoose = require("mongoose");
const RestaurantSchema = require("./restaurantModel");
const UserSchema = require("./userModel");
var Restaurant,User = "";

module.exports = class RestaurantLogic {

    initialize(conn) {
        let databaseConnection = mongoose.createConnection(conn,{ useNewUrlParser: true,useUnifiedTopology: true });
        Restaurant = databaseConnection.model("restaurants", RestaurantSchema);
        User = databaseConnection.model("users", UserSchema);
        return databaseConnection.readyState;
    }

    async addNewRestaurant(data) {
        let newRestaurantData = new Restaurant(data);
        return newRestaurantData.save();
    }

    async getAllRestaurants(page, perPage, borough) {
        if(borough == null || borough == "")
        {
            return Restaurant.find({}).sort({ restaurant_id: 1 }).skip((page -1)*perPage).limit(perPage).lean().exec();
        }else
        {
            return Restaurant.find({borough: borough}).sort({ restaurant_id: 1 }).skip((page -1)*perPage).limit(perPage).lean().exec();
        }
    }

    async getRestaurantById(id) {
        return Restaurant.findOne({ _id: id }).lean().exec();
    }

    async getAll() {
        return Restaurant.find({}).sort({ restaurant_id: 1 }).limit(500).lean().exec();
    }

    async updateRestaurantById(data, id) {
        return Restaurant.updateOne({ _id: id }, { $set: data }).exec();
    }

    async deleteRestaurantById(id) {
        return Restaurant.deleteOne({ _id: id }).exec();
    }

    async findUser(username){
        return User.findOne({ username:username }).exec();
    }

    async getName(token){
        if(token){
            jwt.verify(token,'secretkey',(err,decodedToken) => {
                if(decodedToken.name)
                {
                    return decodedToken.name;
                }
            })
        }else{
            res.redirect('/');
        }
    }
}