/******************************************************************************
***
* ITE5315 – Project
* I declare that this assignment is my own work in accordance with Humber Academic Policy.
* No part of this assignment has been copied manually or electronically from any other source
* (including web sites) or distributed to other students.
*
* Group member Name: Balraj Singh - N01415998,Vishal Gami - N01452433 Date: 16-04-2022
*
*
******************************************************************************
**/

var express = require('express');
var app = express();
require('dotenv').config();
var path = require('path');
const exphbs = require('express-handlebars');
const Handlebars = require('handlebars');
const moment = require("moment");
var bodyParser = require('body-parser');
var alert = require('alert');
const bycrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser');

var port = process.env.PORT || 3000;
app.use(bodyParser.urlencoded({ 'extended': 'true' }));
app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
var config = require('./config/restaurantDatabase');
const { getName, authRole, createToken, checkLogin } = require('./middleware/authUser');
const { param, query, cookies, header, body, validationResult, check } = require('express-validator')

const RestaurantLogic = require("./models/restaurantLogic.js");
const users = require("./models/users.js");
const { default: mongoose } = require('mongoose');
const req = require('express/lib/request');
const res = require('express/lib/response');
const db = new RestaurantLogic();
var isLoggedIn = true;
var name = "";

app.use(cookieParser());

Handlebars.registerHelper('keyExist', function (resKey) {
    if (resKey == undefined || resKey.length === 0) {
        return "N/A";
    } else {
        return resKey;
    }
});

Handlebars.registerHelper('formatDate', function (date, options) {
    const formatToUse = (arguments[1] && arguments[1].hash && arguments[1].hash.format) || "DD/MM/YYYY"
    return moment(date).format(formatToUse);
});

app.use(express.static(path.join(__dirname, 'public'))); //importing static files such as images, CSS in public folder
app.engine('.hbs', exphbs.engine({ extname: '.hbs' })); //register the template engine by given extension
app.set('view engine', 'hbs');

var statusCode = db.initialize(config.url);
if (statusCode == 2) {
    app.listen(port, () => {
        console.log(`server listening on: ${port}`);
    });
} else {
    console.log("Connection error and Failed to start server.");
}


app.get('/api/homepage', authRole(['admin', 'user']), (req, res, next) => {
    res.render('pages/homepage', { title: "Homepage", isLoggedIn: isLoggedIn, name: res.name });
});

app.get('/api/fetchRestaurants', authRole(['admin', 'user']), (req, res, next) => {
    res.render('pages/fetchRestaurantForm', { modalStatus: false, title: "Fetch Restaurants", isLoggedIn: isLoggedIn, name: res.name });
});


app.post('/api/restaurants', function (req, res) {
    const coord = req.body.coord.split(',');
    var data = {
        address: {
            building: req.body.building,
            coord: coord,
            street: req.body.street,
            zipcode: req.body.zipcode
        },
        borough: req.body.borough,
        cuisine: req.body.cuisine,
        grades: [{
            date: req.body.date,
            grade: req.body.grade,
            score: req.body.score
        }],
        name: req.body.name,
        restaurant_id: req.body.restaurant_id
    };
    db.addNewRestaurant(data).then(function (result) {
        if (result == null) {
            (error) => {
                res.status(400).json({
                    error: error
                });
            }
        } else {
            console.log("Data Added Successfully.");
            res.status(201).json("Data Added Successfully having id " + result._id + " and name is " + result.name);
        }
    }).catch(
        (error) => {
            res.status(400).json({
                error: error
            });
        }
    );
});

app.get('/api/restaurants', [
    query('page')
        .isNumeric()
        .withMessage("Page Query must be numeric")
        .exists()
        .withMessage("Page Query should be there"),
    query('perPage')
        .isNumeric()
        .withMessage("Page Query must be numeric")
        .exists()
        .withMessage("perPage Query should be there in url"),
], function (req, res) {
    const errors = validationResult(req);
    const page = req.query.page;
    const perPage = req.query.perPage;
    const borough = req.query.borough;
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    } else {
        if (page == null || page <= 0 || perPage == null || perPage <= 0) {
            res.status(500).json("Status code " + res.statusCode + ": Parameter should not be zero or null");
        } else {
            db.getAllRestaurants(page, perPage, borough).then(function (result) {
                if (result.length == 0) {
                    res.status(500).json("Status code " + res.statusCode + ": No data found ");
                } else {
                    res.status(201).json(result);
                }
            }).catch(
                (error) => {
                    res.status(400).json({
                        error: error
                    });
                }
            );
        }

    }
});

app.get('/api/restaurants/:id',
    check('id')
        .isMongoId()
        .withMessage("Parameter ID is not a mongoose Object ID")
    , function (req, res) {
        var id = req.params.id;
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            db.getRestaurantById(id).then(function (result) {
                if (result == null) {
                    res.status(500).json("Status code " + res.statusCode + ": No data found ");
                } else {
                    console.log("true");
                    res.status(201).json(result);
                }
            }).catch(
                (error) => {
                    res.status(400).json({
                        error: error
                    });
                }
            );
        } else {
            res.status(500).json(errors);
        }
    });

app.put('/api/restaurants/:reqId',
    check('reqId')
        .isMongoId()
        .withMessage("Parameter ID is not a mongoose Object ID")
    , function (req, res) {
        const coord = req.body.coord.split(',');
        const errors = validationResult(req);
        let reqId = req.params.reqId;
        var data = {
            address: {
                building: req.body.building,
                coord: coord,
                street: req.body.street,
                zipcode: req.body.zipcode
            },
            borough: req.body.borough,
            cuisine: req.body.cuisine,
            grades: [{
                date: req.body.date,
                grade: req.body.grade,
                score: req.body.score
            }],
            name: req.body.name,
            restaurant_id: req.body.restaurant_id
        };
        if (errors.isEmpty()) {
            db.updateRestaurantById(data, reqId).then(function (result) {
                if (result.matchedCount == 1) {
                    res.status(201).json("Data updated successfully for id: " + reqId);
                } else {
                    res.status(500).json("Status code " + res.statusCode + ": No data found to update")
                }
            }).catch(
                (error) => {
                    res.status(400).json({
                        error: error
                    });
                }
            );
        } else {
            res.status(500).json(errors);
        }
    });

app.delete('/api/restaurants/:reqId',
    check('reqId')
        .isMongoId()
        .withMessage("Parameter ID is not a mongoose Object ID")
    , function (req, res) {
        const errors = validationResult(req);
        let reqId = req.params.reqId;
        if (errors.isEmpty()) {
            db.deleteRestaurantById(reqId).then(function (result) {
                if (result.deletedCount == 1) {
                    res.status(201).json("Data deleted successfully for id: " + reqId);
                } else {
                    res.status(500).json("Status code " + res.statusCode + ": No data found to delete")
                }
            }).catch(
                (error) => {
                    res.status(400).json({
                        error: error
                    });
                }
            );
        } else {
            res.status(500).json(errors);
        }
    });

// Step 3

app.get('/api/fetchres', [
    query('page')
        .isNumeric()
        .withMessage("Page Query must be numeric")
        .exists()
        .withMessage("Page Query should be there"),
    query('perPage')
        .isNumeric()
        .withMessage("Page Query must be numeric")
        .exists()
        .withMessage("perPage Query should be there in url"),
], authRole(['admin', 'user']), function (req, res) {
    const errors = validationResult(req);
    const page = req.query.page;
    const perPage = req.query.perPage;
    const borough = req.query.borough;
    if (!errors.isEmpty()) {
        res.render('pages/fetchRestaurantForm', { modalStatus: false, error: true, errorMsg: "Some parameter are empty (Express-Validator)", title: "Fetch Details", isLoggedIn: isLoggedIn, name: res.name });
    } else {
        if (page == null || page <= 0 || perPage == null || perPage <= 0) {
            res.render('pages/fetchRestaurantForm', { modalStatus: false, error: true, errorMsg: "Status code " + res.status(500).statusCode + ": Parameter are not valid", title: "Fetch Details", isLoggedIn: isLoggedIn, name: res.name });
        } else {
            db.getAllRestaurants(page, perPage, borough).then(function (result) {
                if (result.length == 0) {
                    res.render('pages/fetchRestaurantForm', { modalStatus: false, error: true, errorMsg: "Status code " + res.status(500).statusCode + ": No data found", title: "Fetch Details", isLoggedIn: isLoggedIn, name: res.name });
                } else {
                    // console.log(result);
                    res.render('pages/fetchRestaurantForm', { restaurant: result, error: false, modalStatus: true, borough: borough, title: "Detailed Restaurant", isLoggedIn: isLoggedIn, name: res.name });
                }
            })
                .catch(
                    (errorMsg) => {
                        res.render('pages/fetchRestaurantForm', { modalStatus: false, error: true, errorMsg: errorMsg, title: "Fetch Details", isLoggedIn: isLoggedIn, name: res.name });
                    }
                );
        }

    }
});

app.get('/api/displayRestaurants', authRole(['admin', 'user']), function (req, res) {
    db.getAll().then(function (result) {
        res.render('pages/displayRestaurants', { restaurant: result, title: "Top 500 Restaurant", isLoggedIn: isLoggedIn, name: res.name });
    })
});

app.get('/api/insertRestaurant', authRole(['admin']), function (req, res) {
    res.render('pages/insertRestaurantForm', { title: "Insert Restaurant", isLoggedIn: isLoggedIn, name: res.name });
});

app.post('/api/insertRestaurant', authRole(['admin']), (req, res) => {
    const coord = req.body.coords.split(',');
    var data = {
        address: {
            building: req.body.buildingNumber,
            coord: coord,
            street: req.body.streetName,
            zipcode: req.body.zipcode
        },
        borough: req.body.borough,
        cuisine: req.body.cuisine,
        grades: [{
            date: req.body.gradeDate,
            grade: req.body.grade,
            score: req.body.score
        }],
        name: req.body.restaurantName,
        restaurant_id: req.body.restaurantId
    };
    db.addNewRestaurant(data).then(function (result) {
        if (result == null) {
            (error) => {
                res.status(400).json({
                    error: error
                });
            }
        } else {
            res.render('partials/alert', { errorMsg: 'Restaurant Added Successfully!' });
            // alert('Restaurant Added Successfully!');
            // res.redirect("/api/homepage");
        }
    }).catch(
        (error) => {
            res.status(400).json({
                error: error
            });
        }
    );

});

app.get('/api/deleteRestaurant', authRole(['admin']), function (req, res) {
    res.render('pages/deleteRestaurantForm', { title: "Delete Restaurant", isLoggedIn: isLoggedIn, name: res.name });
});

app.post('/api/deleteRestaurant', authRole(['admin']), function (req, res) {
    let reqId = req.body.id;
    if (mongoose.isValidObjectId(reqId)) {
        db.deleteRestaurantById(reqId).then(function (result) {
            if (result.deletedCount == 1) {
                res.render('partials/alert', { errorMsg: "Data deleted successfully for id: " + reqId });
                //alert("Data deleted successfully for id: " + reqId);
                //res.redirect("/api/homepage");
            } else {
                res.render('partials/alert', { errorMsg: "No data found to delete for " + reqId });
                //alert("No data found to delete for " + reqId);
                //res.redirect("/api/homepage");
            }
        }).catch(
            (error) => {
                res.status(400).json({
                    error: error
                });
            }
        );
    }
    else {
        res.render('partials/alert', { errorMsg: "Invalid Id:  " + reqId });
        // alert("Invalid Id:  " + reqId);
        // res.redirect("/api/homepage");
    }
});

app.get('/api/updateRestaurant', authRole(['admin']), function (req, res) {
    res.render('pages/updateRestaurantIdForm', { title: "Update Restaurant", isLoggedIn: isLoggedIn, name: res.name });
});

app.post('/api/getDataToUpdateRestaurant', authRole(['admin']), function (req, res) {
    var id = req.body.id;
    if (mongoose.isValidObjectId(id)) {
        db.getRestaurantById(id).then(function (result) {
            if (result == null) {
                res.status(500).json("Status code " + res.statusCode + ": No data found ");
            } else {
                res.render('pages/updateRestaurantForm', { restaurant: result, title: "Update Restaurant", isLoggedIn: isLoggedIn, name: res.name });
            }
        }).catch(
            (error) => {
                res.status(400).json({
                    error: error
                });
            }
        );
    }
    else {
        res.render('partials/alert', { errorMsg: "Invalid Id:  " + id });
        // alert("Invalid Id:  " + id);
        // res.redirect("/api/homepage");
    }
});

app.post('/api/updateRestaurant', authRole(['admin']), (req, res) => {
    let reqId = req.body.id;
    const coord = req.body.coord.split(',');
    var data = {
        address: {
            building: req.body.buildingNumber,
            street: req.body.streetName,
            coord: coord,
            zipcode: req.body.zipcode
        },
        borough: req.body.borough,
        cuisine: req.body.cuisine,
        name: req.body.restaurantName
    };
    db.updateRestaurantById(data, reqId).then(function (result) {
        if (result.matchedCount == 1) {
            res.render('partials/alert', { errorMsg: 'Restaurant Updated Successfully for id : ' + reqId });
            // alert('Restaurant Updated Successfully for id : ' + reqId);
            // res.redirect("/api/homepage");
        } else {
            res.render('partials/alert', { errorMsg: 'Error data updating!' });
            // alert('Error data updating!');
            // res.redirect("/api/homepage");
        }
    }).catch(
        (error) => {
            res.status(400).json({
                error: error
            });
        }
    );
});

// app.get('/api/generate', function (req, res) {
//     bycrypt.genSalt(10, function (err, result) {
//         console.log(result);
//         bycrypt.hash("restaurantapiadmin",result, function (err, pass) { 
//             console.log(pass); 
//         });
//     });
// });

app.get('/', checkLogin, function (req, res) {
    isLoggedIn = false;
    res.render('pages/loginUser', { isLoggedIn: isLoggedIn });
});

app.post('/api/checkUser', function (req, res) {
    const username = req.body.username;
    const password = req.body.password;
    db.findUser(username).then(function (result) {
        if (result == null || result == undefined) {
            res.render('partials/alert', { errorMsg: "Invalid Username" });
        } else {
            bycrypt.compare(password, result.password).then((data) => {
                if (data == true) {
                    const token = createToken(result.role, result.name);
                    isLoggedIn = true;
                    name = result.name;
                    // const time = 2*24*60*60;
                    res.cookie('tokenCookie', token, { httpOnly: true });
                    res.redirect('/api/homepage');
                } else {
                    res.render('partials/alert', { errorMsg: "Password is incorrect" });
                }
            });
        }
    }).catch(
        (error) => {
            res.status(400).json({
                error: error
            });
        }
    );
});

app.get('/api/logout', function (req, res) {
    isLoggedIn = false;
    res.clearCookie("tokenCookie");
    res.redirect('/');
});
