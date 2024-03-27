$(document).ready(function(){
  //Sign-In-button
  $(".btn-lgn").on('click',function(){
      window.location.href="/login"
  })

  //toggler function - mobile and tab
  $(".toggle").on("click",function(){
    $(".navbar").toggle();
  });

  //dynamic request
  $(".option").on("click", function() {
    
    /* this is to indicate in which category the user exist currently.
       the indication is not persistent because of newly rendered html
       document based on the user request. 
    */
    var options = $(".option");
    options.each(function() {
         $(this).removeAttr('id');
    });
    $(this).attr('id', 'active-opt'); 

    //changing category as per user request
    var category = this.innerText.toLowerCase();
    window.location.href = `/${category}`    
  });

  //search bar
  $(".searchBar").on('focus',function(){
    $(".core-container").addClass("core-bg");
  });

  $(".searchBar").on('blur',function(){
    $(".core-container").removeClass("core-bg");
  });

  //share-btn-exit  
  $(".sh-btn-exit").on('click',function(){
    $(".app-container").removeClass("app-bg");
    $(".share-popup").removeClass("active-sh-popup");
  });


  // save article
  $(".save-button").on('click', (event) => {
    var splButtonId1=event.target.getAttribute('id')
    console.log(splButtonId1);
    fetch('/check-auth')
      .then(response => response.json())
      .then(data => {
        if (data.isAuthenticated) {
          // User is authenticated, proceed with save action
          saveArticle(splButtonId1);
          
        } else {
          // User is not authenticated, display login page
          window.location.href="/login"
        }
      })
      .catch(error => {
        console.error('Error checking authentication:', error);
      });
      
  });

  //share article
  $(".btn-share").on('click', (event) => {
    var splButtonId2=event.target.getAttribute('id');
    console.log(splButtonId2);
    fetch('/check-auth')
      .then(response => response.json())
      .then(data => {
        if (data.isAuthenticated) {
          // User is authenticated, proceed with save action
          $(".app-container").addClass("app-bg");
          $(".share-popup").addClass("active-sh-popup");
          shareArticle(splButtonId2);
        } else {
          // User is not authenticated, display login page
          window.location.href="/login"
        }
      })
      .catch(error => {
        console.error('Error checking authentication:', error);
      });
  });

  //delete article
  $(".unsave-button").on('click', (event) => {
    var postID=event.target.getAttribute('id');
    console.log(postID);
    fetch('/check-auth')
      .then(response => response.json())
      .then(data => {
        if (data.isAuthenticated) {
          // User is authenticated, proceed with save action
          deleteArticle(postID);
        } else {
          // User is not authenticated, display login page
          window.location.href="/login"
        }
      })
      .catch(error => {
        console.error('Error checking authentication:', error);
      });
  });

  // view saved article
  $("#check-auth").on('click', (event) => {
    fetch('/check-auth')
      .then(response => response.json())
      .then(data => {
        if (data.isAuthenticated) {
          // User is authenticated, proceed with save action
          window.location.href='/articles';
        } else {
          // User is not authenticated, display login page
          window.location.href="/login"
        }
      })
      .catch(error => {
        console.error('Error checking authentication:', error);
      });
  });
});


//search form
const searchInput = document.getElementById('searchBar');
const suggestionsList = document.getElementById('suggestions');

searchInput.addEventListener('input', debounce(handleSearchInput, 300));

function handleSearchInput() {
  const query = searchInput.value.trim();

    // Make an request to the server for search suggestions
    if(query!==''){
      fetch(`/search?q=${query}`)
        .then(response => response.json())
        .then(data => {
            // Update the suggestions list
            renderSuggestions(data.suggestions);
        })
        .catch(error => console.error('Error fetching suggestions:', error));
    }
    else{
       // Clear suggestions if the query is empty
       renderSuggestions([]);
    }
}

function renderSuggestions(suggestions) {
    // Clear previous suggestions
    suggestionsList.innerHTML = '';

    // Append new suggestions to the list
    suggestions.forEach(suggestion => {
        const li = document.createElement('li');
        li.textContent = suggestion;
        suggestionsList.appendChild(li);
    });
}

// Helper function to debounce input events
function debounce(func, delay) {
  let timeout;
  return function () {
      clearTimeout(timeout);
      timeout = setTimeout(func, delay);
  };
}

suggestionsList.addEventListener('click', function(event) {
  // Check if the clicked element is an <li> inside #suggestions
  if (event.target.tagName === 'LI' && event.target.parentNode === suggestionsList) {
      // Fill the search input with the text content of the clicked list item
      const clickedText = event.target.textContent;
      searchInput.value = clickedText;
  }
});

//save article
function saveArticle(buttonId){
  const articleID = buttonId;
  var newsCard = document.querySelectorAll(".news-post")[articleID];
  var childElements = newsCard.children;
  var imageURL = childElements[1].src;
  var articleTitle = childElements[2].firstElementChild.innerText;
  var articleURL = childElements[2].lastElementChild.firstElementChild.href;
  const articleData = {
    urlToImage:imageURL,
    title:articleTitle,
    url:articleURL
  }
  const url = "http://localhost:8080/save"
  fetch(url,{
    method:'POST',
    headers: {
      "Content-type": "application/json; charset=UTF-8"
    },
    body:JSON.stringify(articleData)
  })
  .then((response)=>{
    console.log(response.JSON)
  })
  .catch((err)=>{
    console.log(err)
  })
}


function shareArticle(buttonId){
    const articleID = buttonId;
    var newsCard = document.querySelectorAll(".news-post")[articleID];
    var childElements = newsCard.children;
    var imageURL = childElements[1].src;
    var articleTitle = childElements[2].firstElementChild.innerText;
    var articleURL = childElements[2].lastElementChild.firstElementChild.href;
    const articleData = {
      urlToImage:imageURL,  
      title:articleTitle,
      url:articleURL
    }

    //share via link
    document.getElementById("cpy-link").addEventListener("click",()=>{
      console.log(articleURL);
      if (navigator.clipboard) {
        // Clipboard API is supported
        const textToCopy = articleURL;
        navigator.clipboard.writeText(textToCopy)
      .then(() => {
        alert("Text copied to clipboard.");
      })
      .catch(err => {
        alert("Unable to copy text: ", err);
      });

      } else {
        alert("Sorry, The browser doesn't have clipboard support. Try using different browser.")
      }

    });

    //share via whatsapp
    document.getElementById("whatsappIt").addEventListener("click",()=>{
      console.log(articleURL);
        const content = `Check out this article: ${articleURL}`; 
      // Create a WhatsApp share link
      const shareURL = 'whatsapp://send?text=' + encodeURIComponent(content);
      window.location.href = shareURL;
    });
  
    //share via email
    document.getElementById("mailIt").addEventListener("click",()=>{
      console.log(articleURL);
      const emailSubject = encodeURIComponent('Check out this news article: ' + articleTitle);
      const emailBody = encodeURIComponent('I thought you might find this article interesting:\n' + articleURL);
      window.location.href = 'mailto:?subject=' + emailSubject + '&body=' + emailBody;
    });
}

//delete article
function deleteArticle(postId){
  const articleID = postId;
      console.log(articleID);
      const articleData = {
        id:articleID
      }
      const url = "http://localhost:8080/delete"
      fetch(url,{
        method:'POST',
        headers: {
          "Content-type": "application/json; charset=UTF-8"
        },
        body:JSON.stringify(articleData)
      })
      .then((response)=>{
        console.log(response.JSON)
      })
      .catch((err)=>{
        console.log(err)
      })  
}