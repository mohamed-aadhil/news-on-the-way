const mongoose = require('mongoose');

const savedArticleSchema = new mongoose.Schema({
    urlToImage:String,
    title:String,
    url:String
});

const SavedArticle = mongoose.model('SavedArticle', savedArticleSchema);

module.exports = SavedArticle;
