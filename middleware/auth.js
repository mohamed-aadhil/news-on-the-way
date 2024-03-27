require("dotenv").config()
const jwt = require('jsonwebtoken')
const User = require("../user.js")

//middleware
const checkUser =(req,res,next)=>{
    const token = req.cookies.jwt
    if(token){
        jwt.verify(token,process.env.SECRET,async(err,decodedToken)=>{
            if(err){
                res.locals.user = null
                next()
            }
            else{
                let user = await User.findById(decodedToken.id)
                res.locals.user = user
                next()
            }
        })
    }
    else{
       res.locals.user = null
       next()
    }   
}

module.exports ={checkUser}
