const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const {isEmail} = require("validator");

const userSchema = new mongoose.Schema({
  username:{
    type:String,
    required:[true,"Please enter a username"],
    unique:true,
  },
  email: {
    type:String,
    required:[true,"Please enter a email"],
    unique:true,
    validate:[isEmail,"Please enter a valid email"]
  },
  password:{
    type:String,
    required:true,
    minLength:[6,"Password must be minimum 6 characters"]
  },
  savedArticles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SavedArticle' }],
  sharedArticles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SharedArticle' }],
});

userSchema.statics.login = async function(username,password){
  const user = await this.findOne({username})
  if(user){
    const auth = await bcrypt.compare(password, user.password)
    console.log(auth);
    if(auth){
      return user
    }
    else{
      throw Error("incorrect password")
    }
  }
  else{
    throw Error("incorrect username")
  }
}

const User = mongoose.model('User', userSchema);

module.exports = User;
