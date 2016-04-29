var bcrypt = require('bcrypt');
var HASH_ROUNDS = 10;

module.exports = function RedditAPI(conn) {
  return {
    createUser: function(user, callback) {

      // first we have to hash the password...
      bcrypt.hash(user.password, HASH_ROUNDS, function(err, hashedPassword) {
        if (err) {
          callback(err);
        }
        else {
          conn.query(
            'INSERT INTO `users` (`username`,`password`, `createdAt`) VALUES (?, ?, ?)', [user.username, hashedPassword, null],
            function(err, result) {
              if (err) {
                /*
                There can be many reasons why a MySQL query could fail. While many of
                them are unknown, there's a particular error about unique usernames
                which we can be more explicit about!
                */
                if (err.code === 'ER_DUP_ENTRY') {
                  callback(new Error('A user with this username already exists'));
                }
                else {
                  callback(err);
                }
              }
              else {
                /*
                Here we are INSERTing data, so the only useful thing we get back
                is the ID of the newly inserted row. Let's use it to find the user
                and return it
                */
                conn.query(
                  'SELECT `id`, `username`, `createdAt`, `updatedAt` FROM `users` WHERE `id` = ?', [result.insertId],
                  function(err, result) {
                    if (err) {
                      callback(err);
                    }
                    else {
                      /*
                      Finally! Here's what we did so far:
                      1. Hash the user's password
                      2. Insert the user in the DB
                      3a. If the insert fails, report the error to the caller
                      3b. If the insert succeeds, re-fetch the user from the DB
                      4. If the re-fetch succeeds, return the object to the caller
                      */
                      callback(null, result[0]);
                    }
                  }
                );
              }
            }
          );
        }
      });
    },
    createPost: function(post, subreddit, callback) {
      conn.query(
        'INSERT INTO `posts` (`userId`, `subredditId`, `title`, `url`, `createdAt`) VALUES (?, ?, ?, ?, ?)', [post.userId, subreddit, post.title, post.url, null],
        function(err, result) {
          if (err) {
            callback(err);
          }
          else {
            /*
            Post inserted successfully. Let's use the result.insertId to retrieve
            the post and send it to the caller!
            */
            conn.query(
              'SELECT * from posts WHERE id = ? AND subredditId = ?', [result.insertId, subreddit],
              function(err, result) {
                if (err) {
                  callback(err);
                }
                else {
                  callback(null, result[0]);
                }
              }
            );
          }
        }
      );
    },
    getAllPosts: function(options, callback) {
      // In case we are called without an options parameter, shift all the parameters manually
      if (!callback) {
        callback = options;
        options = {};
      }
      var limit = options.numPerPage || 25; // if options.numPerPage is "falsy" then use 25
      var offset = (options.page || 0) * limit;

      conn.query(`
        SELECT
          \`posts\`.\`id\`AS\`posts_id\`,
          \`title\`,
          \`url\`,
          \`userId\`,
          \`posts\`.\`createdAt\`AS\`posts_createdAt\`,
          \`posts\`.\`updatedAt\`AS\`posts_updatedAt\`,
          \`users\`.\`id\`,
          \`username\`,
          \`users\`.\`createdAt\`AS\`users_createdAt\`,
          \`users\`.\`updatedAt\`AS\`users_updatedAt\`,
          \`subreddits\`.\`name\`AS\`subreddits_name\`
        FROM \`posts\`
        JOIN\`users\`ON\`users\`.\`id\`=\`posts\`.\`userId\`
        JOIN\`subreddits\`ON\`subreddits\`.\`id\`=\`posts\`.\`subredditId\`
        ORDER BY \`posts\`.\`createdAt\` DESC
        LIMIT ? OFFSET ?
        `, [limit, offset],
        function(err, results) {
          if (err) {
            callback(err);
          }
          else {
            var outPut = results.map(function(obj) {
              return {
                id: obj.posts_id,
                title: obj.title,
                url: obj.url,
                createdAt: obj.posts_createdAt,
                updatedAt: obj.posts_updatedAt,
                userId: obj.userId,
                subredditName: obj.subreddits_name,
                user: {
                  id: obj.userId,
                  username: obj.username,
                  createdAt: obj.users_createdAt,
                  updatedAt: obj.users_updatedAt
                }
              }
            })
            callback(null, outPut);
          }
        }
      );
    },

    getPostForUser: function(postId, options, callback) {
      if (!callback) {
        callback = options;
        options = {};
      }
      var limit = options.numPerPage || 25; // if options.numPerPage is "falsy" then use 25
      var offset = (options.page || 0) * limit;


      conn.query(
        'SELECT `id`,`title`,`url`,`userId`, `createdAt`, `updatedAt` FROM `posts` WHERE `id` = ?', [postId],
        function(err, results) {
          if (err) {
            callback(err)
          }
          else {
            callback(results)
          }
        })
    },
    createSubreddit: function(sub, callback) {
      conn.query(
        'INSERT INTO `subreddits` (`name`, `description`, `createdAt`) VALUES (?, ?, ?)', [sub.name, sub.description, null],
        function(err, result) {
          if (err) {
            callback(err);
          }
          else {
            /*
            Post inserted successfully. Let's use the result.insertId to retrieve
            the post and send it to the caller!
            */
            conn.query(
              'SELECT `id`,`name`,`description` FROM subreddits WHERE id=?', [result.insertId],
              function(err, result) {
                if (err) {
                  callback(err);
                }
                else {
                  callback(null, result[0]);
                }
              }
            );
          }
        }
      );
    },
    getAllSubreddits: function(callback) {
      conn.query(
        `SELECT * FROM subreddits
        ORDER BY createdAt`,
        function(err, result) {
          if (err) {
            callback(err);
          }
          else {
            callback(result);
          }
        }
      );
    },
    createComment: function(comment, callback) {
      conn.query(
        `INSERT INTO comments ( text, userId, parentId, createdAt) VALUES (?,?,?,?)`, [comment.text, comment.userId, comment.parentId, null],
        function(err, result) {
          if (err) {
            callback(err)
          }
          else {
            conn.query(
              'SELECT `id`,`text`, `parentId` FROM comments WHERE id=?', [result.insertId],
              function(err, result) {
                if (err) {
                  callback(err);
                }
                else {
                  callback(null, result);
                }
              }
            );
          }
        }
      )
    },
    getCommentsForPost: function(callback) {
      // if (!callback) {
      //   callback = options;
      //   options = {};
      // }
      // var limit = options.numPerPage || 25; // if options.numPerPage is "falsy" then use 25
      // var offset = (options.page || 0) * limit;

      conn.query(`
        SELECT
          c1.text AS c1_text,
          c1.createdAt AS c1_createdAt,
          c1.updatedAt AS c1_updatedAt,
          c2.text AS c2_text,
          c2.createdAt AS c2_createdAt,
          c2.updatedAt AS c2_updatedAt
        FROM comments AS c1 
        LEFT JOIN comments AS c2 ON c1.id=c2.parentId
        WHERE c1.parentId IS NULL`,

        function(err, results) {
          if (err) {
            callback(err);
          }
          else {
            var outPut = results.map(function(obj) {
              return {

                text: obj.c1_text,
                createdAt: obj.c1_createdAt,
                updatedAt: obj.c1_updatedAt,
                replies: [{
                  text: obj.c2_text,
                  createdAt: obj.c2_createdAt,
                  updatedAt: obj.c2_updatedAt
                }]
              }
            })
            callback(null, outPut);
          }
        }
      );
    },
    getSinglePost: function(postId, options, callback) {
      if (!callback) {
        callback = options;
        options = {};
      }
      var limit = options.numPerPage || 25; // if options.numPerPage is "falsy" then use 25
      var offset = (options.page || 0) * limit;


      conn.query(
        `SELECT
          id,
          title,
          url,
          userId,
          createdAt,
          updatedAt
          FROM posts WHERE id = ?`, [postId],
        function(err, results) {
          if (err) {
            callback(err)
          }
          else {
            callback(results)
          }
        })
    },
  }
}
