// load the mysql library
var mysql = require('mysql');
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var secureRandom = require('secure-random');
var cookieParser = require('cookie-parser');

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

app.use(bodyParser())
app.use(cookieParser())
app.use(checkLoginToken);



function betterLog(value) {
  console.log(require('util').inspect(value, {
    depth: 20,
    colors: true
  }));
}




// It's request time!
// redditAPI.createUser({
//   username: 'hello24',
//   password: 'xxx'
// }, function(err, user) {
//   if (err) {
//     console.log(err);
//   }
//   else {
//     redditAPI.createPost({
//       title: 'HEY reddit!',
//       url: 'https://www.reddit.com',
//       userId: user.id
//     }, function(err, post) {
//       if (err) {
//         console.log(err);
//       }
//       else {
//         console.log(post);
//       }
//     });
//   }
// });

// redditAPI.getAllPosts(10, function(err, result){
//   if (err){
//     console.log(err)
//   } else {
//     console.log(null, result);
//   }
// });


// redditAPI.getPostForUser(2, 10, function(err, result){
//   if (err){
//     console.log(err)
//   } else {
//     console.log(result);
//   }
// });


// redditAPI.createSubreddit({
//   name:'Fun12311',
//   description: 'pretty cool stuff'
// }, function(err,result){
//   if(err){
//   console.log(err)
//   } else{
//     console.log(result)
//   }
// })


// redditAPI.getAllSubreddits(function(result){
//   console.log(result);
// })

// redditAPI.createPost({
//   userId: 1,
//   title: 'Codrian is crazy', 
//   url: 'www.hey.com'
// },1, function(err,result){
//   console.log(result)
// })


// redditAPI.createComment({
//   text: "I like it!",
//   userId: 1,
//   postId: 8,
//   parentId: 4
// }, function(err, result){
//   if (err){
//     console.log(err)
//   }else {
//     console.log(result)
//   }
// })



// redditAPI.getCommentsForPost(function(err,result){
//   if(err){
//     console.log(err)
//   }else betterLog(result)
// })



// redditAPI.getSinglePost(8, 10, function(err, result) {
//   if (err) {
//     console.log(err)
//   }
//   else {
//     betterLog(result)
//   }
// })


// redditAPI.getComments(5, function(err, res) {
//   console.log(JSON.stringify(res, null, 4));
// })

function createPostItem(post) {
  return `
    <li class="content-item">
      <h2 class="content-item__title">
        <a href=${post.url}>${post.title}</a>
      </h2>
      <p>Created by ${post.user.username}</p>
      
    <form action="/vote" method="post">
      <input type="hidden" name="vote" value="1">
      <input type="hidden" name="postId" value=${post.id}>
      <button type="submit">Upvote</button>
    </form>
    
    <form action="/vote" method="post">
      <input type="hidden" name="vote" value="-1">
      <input type="hidden" name="postId" value=${post.id}>
      <button type="submit">Downvote</button>
    </form>
    </li>

    `
}

function createPostList(posts) {
  return `
   <div id="contents">
     <h1>List of posts</h1>
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
      var allPosts = posts.map(createPostItem);

      res.send(createPostList(allPosts));
    }
  });
});


//Takes you to the signup form
app.get('/signup', function(req, res) {
  res.sendFile(path.join(__dirname + '/signupform.html'));
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
      response.redirect('/login');
    }
  })
})



//Login page
app.get('/login', function(req, res) {
  res.sendFile(path.join(__dirname + '/loginform.html'));
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
          response.redirect('/login');
        }
      });
    }
  })
})




//Create port form
app.get('/createpost', function(req, res) {
  res.sendFile(path.join(__dirname + '/postform.html'));
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
      console.log(err)
      response.send(err)
    }
    else {
      response.redirect('/')
    }
  }
  )
})










var server = app.listen(process.env.PORT, process.env.IP, function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
