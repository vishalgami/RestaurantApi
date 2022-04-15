const res = require('express/lib/response');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const checkLogin = (req,res,next) => {
    const token = req.cookies.tokenCookie;
    if(token){
        res.redirect('api/homepage');
    }else
    {
        next();
    }
}

const authRole = (data) => (req,res,next) => {
    const token = req.cookies.tokenCookie;
    if(token){
        jwt.verify(token,process.env.SECRET_KEY,(err,decodedToken) => {
            if(data.includes(decodedToken.role))
            {
                res.name = decodedToken.name;
                next();
            }else{
                res.render('partials/alert',{layout:false,errorMsg: "You are not authorized to access"});
            }
        })
    }else{
        res.redirect('/');
    }
}

// const time = 2*24*60*60;
const createToken = (role,name) => {
    return jwt.sign({role,name},process.env.SECRET_KEY);
}


module.exports = {authRole,createToken,checkLogin }