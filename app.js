//dependencies
require("dotenv").config()
const express = require("express");
const ejs = require("ejs");
const axios = require("axios");
const mongoose = require ("mongoose");
const SavedArticle = require("./save.js");
const User = require("./user.js");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const {checkUser} = require("./middleware/auth.js");

//Initializing server
const app = express();
app.listen(process.env.PORT)

//mounting middlewares
app.use(express.json())
app.use(bodyParser.urlencoded({extended:true}))
app.use(cookieParser());
app.use(express.static(__dirname+"/public"));

//setting template engine for dynamic page generation (SSR)
app.set('view engine','ejs');

//connecting to database
mongoose.connect(process.env.DATABASE_URL);

//requirements for external REST API(NEWS API) calls 
const country = "in";
const api_key = process.env.API_KEY;
const pageSize = 15;

//dummy-image 
const Img = "/Images/Newspaper.jpeg";

//mounting authentication middleware to all get routes
app.get('*',checkUser)

//error-handling
function handleErrors(err){
    console.log(err.message,err.code)
    let errors = {
        username:'',
        email:'',
        password:''
    }
    if(err.message === "incorrect username"){
        errors.username = "The username doesn't exists.";
    }
    if(err.message === "incorrect password"){
        errors.password = "The password is incorrect"
    }

    if(err.code === 11000){

        errors.email = "The email is already registered";
        return errors
    }
    if(err.message.includes("user validation failed")){
        Object.values(err.errors).forEach(({properties})=>{
            errors[properties.path]=properties.message;
        })
    }
    return errors 
} 

//JWT-lifespan
const maxAge = 2 * 24 * 60 * 60;

//JWT-generation
const createToken = (id)=>{
    return jwt.sign({id},process.env.SECRET,{expiresIn:maxAge})
}

//user-registration
app.post('/signup',(req,res)=>{
  bcrypt.hash(req.body.password,10, function(err, hash) {
    const userData = {
        username:req.body.username,
        email:req.body.email,
        password:hash
      }
      async function saveUser(userData){
        try{
          const user = await User.create(userData)
          const token = createToken(user._id)
          res.cookie('jwt',token,{httpOnly:true,maxAge:maxAge,path: '/',sameSite: 'None',secure: true})
          res.status(201).json({user:user._id});
        }
        catch(err){
          const errors = handleErrors(err)
          res.status(400).json({errors});
        }
      }
      saveUser(userData)
  });
})

//user-login
app.post('/signin',async(req,res)=>{
    const {username,password} = req.body;
    try{
      const user = await User.login(username,password) 
      const token = createToken(user._id)
      res.cookie('jwt',token,{httpOnly:true,maxAge:maxAge,path: '/',sameSite: 'None',secure: true }) 
      res.status(200).json({user:user._id})
    }
    catch(err){
        const errors = handleErrors(err)
        res.status(400).json({errors});
    }
    
})

//temporary token generation for password reset 
const resetToken = (user)=>{
  const secret = process.env.SECRET + user.password;
  const payload = {
    id:user.id,
    email:user.email
  }
  return jwt.sign(payload,secret,{expiresIn:'15m'})
}

//password-reset
app.post("/forgetPassword",async(req,res)=>{
  try {
    const user = await User.findOne({email:req.body.email})
    if(user){
      const reset_token = resetToken(user)
      const link = `http://localhost:8080/resetPassword/${user._id}/${reset_token}`
      res.status(200).json({user:link})
    }
    else{
      res.status(400).json({error:'Email ID not found'})
    }
  } catch (error) {
      console.log(error);  
  }
  
})

app.get('/resetPassword/:id/:token',async(req,res)=>{
  const {id,token} = req.params;
  const user = await User.findOne({_id:id})
  if(id!==user._id.valueOf()){
    res.status(401).json({error:'Invalid ID'});
    res.send("Invalid ID")
    return
  }
  const secret = process.env.SECRET+user.password
  jwt.verify(token,secret,async(err,decodedToken)=>{
    if(err){
        res.status(401).json({error:err.message});
    }
    else{
        res.render('reset');
    }
})
})

app.post('/resetPassword/:id/:token',async(req,res)=>{
  const {id,token} = req.params;
  const {password,confirmPassword} = req.body;
  const user = await User.findOne({_id:id})
  if(id!==user._id.valueOf()){
    res.status(401).json({error:'Invalid ID'});
    return
  }
  const secret = process.env.SECRET+user.password
  jwt.verify(token,secret,async(err,decodedToken)=>{  
    if(err){
        res.status(401).json({error:err.message});
    }
    else{
      if (password !== confirmPassword) {
        res.status(401).json({ error: 'Password confirmation does not match password' });
      }
      else{
        const user = await User.findOne({_id:decodedToken.id,email:decodedToken.email});
        bcrypt.hash(password,10, async function(err, hash) {
          const updatedUser = await User.findOneAndUpdate({_id:user._id},{password:hash})
          res.status(201).json({user:updatedUser.username});
        })
      }
    }
  })
})

//user-signout
app.get("/signout",(req,res)=>{
  res.cookie("jwt",'',{maxAge:1})
  res.redirect("/");
})

//checking user-authentication status 
app.get('/check-auth',(req, res) => {
    try {
      if (res.locals.user) {
        res.json({ isAuthenticated: true});
      } else {
        res.json({ isAuthenticated: false });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
});
  
//save article in database
app.post('/save',checkUser,async(req,res)=>{
const savedArticle = new SavedArticle(req.body);
savedArticle.save()
  .then(savedArticle => {
    User.findOne({ _id:res.locals.user._id })
      .then(user => {
        user.savedArticles.push(savedArticle._id);
        user.save()
          .then(() => {
            res.status(201).json({success:'article successfully inserted'})
          })
          .catch(error => {
            console.log(error);
          });
      })
      .catch(error => {
        console.log(error);
      });
  })
  .catch(error => {
    console.log(error);
  });   
})

const redirectToArticles = async (req, res) => {
  var data = await SavedArticle.find();
  res.render('articles', { articles: data, dummyImg: Img, user: res.locals.user });
};

//delete article in database
app.post('/delete',checkUser,(req,res)=>{
  const userId =res.locals.user._id ; 
  const savedArticleId = req.body.id; 

  const deleteSavedArticle = async () => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        // Handle the case where the user is not found
        console.log('User not found');
        return;
      }

      // Remove the saved article ID from the user's savedArticles array
      const savedArticleIndex = user.savedArticles.indexOf(savedArticleId);
      if (savedArticleIndex !== -1) {
        user.savedArticles.splice(savedArticleIndex, 1);
      }

      // Save the updated user document
      await user.save();

      // Delete the saved article document from the SavedArticle collection
      await SavedArticle.deleteOne({_id:savedArticleId});
      await redirectToArticles(req, res);
    
    }
    catch (error) {
      // Handle any errors that occur during the process
      console.error('Error:', error);
    }
  };

  // Call the async function to delete the saved article
  deleteSavedArticle();
})

app.post("/search",checkUser,(req,res)=>{
  const topic = req.body.search;
  async function fetchNews(){
    try{
      const response = await axios.get(`https://newsapi.org/v2/everything?q=${topic}&apiKey=${api_key}&pageSize=6&sortBy=popularity`)
      var data = response.data.articles;
      res.render('home',{articles:data,dummyImg:Img,user:res.locals.user});
  }
  catch(err){
      console.log(err)
  }
  }
   fetchNews(); 
})

//Generating search suggestions
app.get('/search', (req, res) => {
  const query = req.query.q;

  //fetch and return search suggestions based on the query
    const suggestions = getSearchSuggestions(query);
    res.json({ suggestions });
});

function getSearchSuggestions(query) {
    const mockSuggestions = [
    'GPT-3',
    'OpenAI Codex',
    'BERT',
    'SpaceX Starship',
    'Quantum Computing',
    'Neuralink',
    'Blockchain Technology',
    'NASA Artemis Program',
    'Artificial Intelligence',
    'Self-Driving Cars',
    'Elon Musk',
    'Machine Learning',
    'Tesla Cybertruck',
    'International Space Station (ISS)',
    'Deep Learning',
    'Augmented Reality',
    'Virtual Reality',
    'Mars Exploration',
    'Boston Dynamics',
    'Blue Origin',
    'Quantum Supremacy',
    'Hydrogen Fuel Cells',
    '5G Technology',
    'Smart Cities',
    'Drones',
    'Hyperloop',
    'Edge Computing',
    'Renewable Energy',
    'Internet of Things (IoT)'];
    return mockSuggestions.filter(suggestion => suggestion.includes(query));
}

//fetch saved articles
app.get("/articles",function(req,res){
  const fetchSavedArticles = async () => {
    try {
      const userId = res.locals.user._id;
      const user = await User.findById(userId);
      if (!user) {
        // Handle the case where the user is not found
        console.log('User not found');
        return;
      }
      //.populate() method to fetch the saved articles
      await user.populate('savedArticles');

      // Access the populated savedArticles array
      const savedArticles = user.savedArticles;

      // Now, savedArticles contains the actual SavedArticle documents
      res.render("articles",{articles:savedArticles,user:res.locals.user});
    } 
    catch (error) {
      // Handle any errors that occur during the process
      console.error('Error:', error);
    }
  };

  // Call the async function to fetch the saved articles
  fetchSavedArticles();
})

//render login-page
app.get('/login',(req,res)=>{
  res.render('login');
})

//render password-reset page
app.get('/reset',(req,res)=>{
  res.render('reset');
})

//home-route
app.get('/',(req,res)=>{
   async function fetchNews(){
    try{
      const response = await axios.get(`https://newsapi.org/v2/top-headlines?country=${country}&apikey=${api_key}&category=general&pageSize=${pageSize}`)
      var data = response.data.articles;
      res.render('home',{articles:data,dummyImg:Img,user:res.locals.user});
  }
  catch(err){
      console.log(err)
  }
  }
   fetchNews(); 
});

//dynamic-route using path parameters
app.get('/:category',checkUser,(req,res)=>{
  var category = req.params.category;
  async function fetchNews(){
    try{
      var response = await axios.get(`https://newsapi.org/v2/top-headlines?country=${country}&apikey=${api_key}&category=${category}&pageSize=${pageSize}`)
      var data = response.data.articles;
      res.render('home',{articles:data,dummyImg:Img,user:res.locals.user});   
    }
    catch(err){
      console.log(err)
    }
  }
  fetchNews();   
})




