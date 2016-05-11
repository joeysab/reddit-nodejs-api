// load the mysql library
var mysql = require('mysql');
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var secureRandom = require('secure-random');
var cookieParser = require('cookie-parser');
var React = require('react');
var render = require('react-dom/server').renderToStaticMarkup;



// create a connection to our Cloud9 server
var connection = mysql.createConnection({
  host: 'localhost',
  user: 'joeysab', // CHANGE THIS :)
  password: '',
  database: 'reddit'
});

// load our API and pass it the connection
var reddit = require('./reddit');
var redditAPI = reddit(connection);

//End of import

function checkLoginToken(request, response, next) {
  if (request.cookies.SESSION) {
    redditAPI.getUserFromSession(request.cookies.SESSION, function(err, user) {
      if (user) {
        request.loggedInUser = user;
      }
      next();
    })
  }
  else {
    next()
  }
}

var app = express();

app.use('/static', express.static('public'));
app.use(bodyParser())
app.use(cookieParser())
app.use(checkLoginToken);




function betterLog(value) {
  console.log(require('util').inspect(value, {
    depth: 20,
    colors: true
  }));
}






function createPostItem(post, loggedIn) {
  return `
    <li class="content-item">
      <h2 class="content-item__title">
        <a href=${post.url}>${post.title}</a>
      </h2>
      <p>Created by ${post.user.username}</p>
      
      
      
      
      ${loggedIn ? ` <form action="/vote" method="post">
    <input type="hidden" name="vote" value="1">
      <input type="hidden" name="postId" value=${post.id}>
      <button type="submit">Upvote</button>
    </form>
    <form action="/vote" method="post">
      <input type="hidden" name="vote" value="-1">
      <input type="hidden" name="postId" value=${post.id}>
      <button type="submit">Downvote</button>
    </form>` : ``}
    </li>
    `
}

function createPostList(posts) {
  return `
   <div id="contents">
     <h1 class='mainTitle'>List of posts</h1>
       <ul class="contents-list">
         ${posts.join('')}
       </ul>
   </div>
`;
}

app.get('/', function(req, res) {
  redditAPI.getAllPosts(function(err, posts) {
    if (err) {
      res.status(500).send(err);
    }
    else {
      var checkUser = req.loggedInUser;
      var allPosts = posts.map(function(post){
        return createPostItem(post, checkUser)
      });

      res.send(renderPage('homepage', req.loggedInUser, createPostList(allPosts)));
    }
  });
});


//Takes you to the signup form
app.get('/signup', function(req, res) {
  var html = `<form action="/signup" method="POST"> 
  <div>
    <input type="text" name="username" placeholder="Enter username">
  </div>
  <div>
    <input type="text" name="password" placeholder="Enter password">
  </div>
  <button type="submit">Signup</button>
</form>`
  
  res.send(renderPage('Sign up', false, html));
});



//Pushes new user created info to database
app.post('/signup', function(request, response) {

  // Prepare output in JSON format
  var user = {
    username: request.body.username,
    password: request.body.password
  };

  redditAPI.createUser(user, function(err, res) {
    if (err) {

      response.status(500).send("Oops");
    }
    else {
      response.redirect('/login')
    }
  })
})






//Login page
app.get('/login', function(req, res) {

  var html = `<form action="/login" method="POST"> <!-- what is this method="POST" thing? you should know, or ask me :) -->
  <div>
    <input type="text" name="username" placeholder="Enter username">
  </div>
  <div>
    <input type="text" name="password" placeholder="Enter password">
  </div>
  <button type="submit">Login</button>
</form>`;

  res.send(renderPage('login', false, html));




});

app.post('/login', function(request, response) {
  var username = request.body.username;
  var password = request.body.password
  redditAPI.checkLogin(username, password, function(err, user) {
    if (err) {
      response.status(401).send(err.message);
    }
    else {
      redditAPI.createSession(user.id, function(err, token) {
        if (err) {
          response.status(500).send('an error occurred. please try again later!');
        }
        else {
          response.cookie('SESSION', token); // the secret token is now in the user's cookies!
          response.redirect('/');
        }
      });
    }
  })
})




//Create port form
app.get('/createpost', function(req, res) {
  var html = `<form action="/createpost" method="POST"> 
  <div>
    <input type="text" name="title" placeholder="Enter Title">
  </div>
  <div>
    <input type="text" name="url" placeholder="Enter URL">
  </div>
  <button type="submit">Create</button>
</form>`;
res.send(renderPage('Create new Post', req.loggedInUser, html))
});

app.post('/createPost', function(request, response) {
  var userId = request.loggedInUser
    // before creating content, check if the user is logged in
  if (!request.loggedInUser) {
    // HTTP status code 401 means Unauthorized
    response.status(401).send('You must be logged in to create content!');
  }
  else {
    redditAPI.createPost({
      title: request.body.title,
      url: request.body.url,
      userId: userId
    }, function(err, post) {
      if (err) {
        response.send(err)
      }
      else {
        response.redirect('/')
      }
      // do something with the post object or just response OK to the user :)
    })
  }
})



app.post('/vote', function(request, response) {
  var vote = {
    userId: request.loggedInUser,
    postId: request.body.postId,
    vote: request.body.vote
  }


  redditAPI.createVote(vote, function(err, res) {
    if (err) {
      response.send(err)
    }
    else {
      response.redirect('/')
    }
  })
})

app.get('/sort/:sort', function(req, res) {
  redditAPI.getAllPostsSorted(req.params.sort, function(err, posts) {
    if (err) {
      res.status(500).send(err);
    }
    else {
      var allPosts = posts.map(function(post) {
        return createPostItem(post, req.loggedInUser);
      });
      
      
      res.send(renderPage(req.params.sort, req.loggedInUser, createPostList(allPosts)));
    }
  });
});


app.get('/', function(req, res) {
  redditAPI.getAllPostsSorted(req.sort, function(err, posts) {
    if (err) {
      res.status(500).send(err);
    }
    else {
      var allPosts = posts.map(createPostItem);
      res.send(createPostList(allPosts));
    }
  });
});


app.get('/logout', function(request, response) {
  if (!request.loggedInUser) {
    response.status(401).send("Oops something went wrong with the logout!");
  } else {
    redditAPI.logOut(request.loggedInUser.userId, request.loggedInUser.token, function(err, result) {
      if (err) {
        response.status(500).send('Oops! An error occurred. Please try again later!');
      } else {
        response.clearCookie('SESSION');  // clears cookie in the browser
        response.redirect('/');
      }
    });
  }
});



function renderPage(title, isLoggedIn, content) {
var loggedIn = ` <nav class= loggedInMenu><img src='https://vb.northsearegion.eu/files/theme/default-user-icon-profile.png' width=50px height= 50px><form><button type="submit">${isLoggedIn ? `<a href ='/logout'>Logout</a>` : ``}</button></form>`;
var loggedOut = `<nav> <ul>
  <li><a href="/login" class="round green">Login<span class="round">That is, if you already have an account.</span></a></li>
  <li><a href="/signup" class="round red">Sign Up<span class="round">But only if you really, really want to. </span></a></li>
  </ul></nav>`;
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <title>${title}</title>
      <link rel= 'stylesheet' href= '/static/main.css'> 
    </head>
    <body>
      <header>
        <div><a href= 'https://reddit-nodejs-api-joeysab.c9users.io/'><img id = 'redditLogo' src='https://www.redditstatic.com/about/assets/reddit-logo.png'></a></div>
         <a href="/" class="">Home</a>
         <a href="/sort/hot" class="">Hot</a>
         <a href="/sort/top" class="">Top</a>
         <a href="/sort/new" class="">New</a>
          ${isLoggedIn ? loggedIn : loggedOut}
          


        
      </header>
      <main>
        ${content}
      </main>
      <footer>
        
      </footer>
    </body>
  </html>
  `;
}


var server = app.listen(process.env.PORT, process.env.IP, function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
