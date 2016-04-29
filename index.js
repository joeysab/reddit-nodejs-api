// load the mysql library
var mysql = require('mysql');


function betterLog(value) {
  console.log(require('util').inspect(value, {depth: 20, colors: true}));
}


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
//   title: 'Nop, you suck', 
//   url: 'www.yourcat.com'
// },1, function(err,result){
//   console.log(result)
// })


// redditAPI.createComment({
//   text: "hey macarena",
//   userId: 1,
//   parentId: 1
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