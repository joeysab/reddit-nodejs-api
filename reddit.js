var bcrypt = require('bcrypt');
var HASH_ROUNDS = 10;
var secureRandom = require('secure-random');




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
                  console.log(err, 'asdadasdas')
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
                      console.log('in the insert user callbaclk')
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
      if (!callback) {
        callback = subreddit;
        subreddit = null
      }
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
              `SELECT * from posts WHERE id = ? ${subreddit ? 'AND subredditId = ?' : ''}`, [result.insertId, subreddit],
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
        posts.id AS posts_id,
        title,
        url,
        userId,
        posts.createdAt AS posts_createdAt,
        posts.updatedAt AS posts_updatedAt,
        users.id,
        username,
        users.createdAt AS users_createdAt,
        users.updatedAt AS users_updatedAt,
        subreddits.name AS subreddits_name
      FROM posts
      JOIN users ON users.id=posts.userId
      LEFT JOIN subreddits ON subreddits.id = posts.subredditId
      ORDER BY posts.createdAt DESC
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
      )
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
        `INSERT INTO comments ( text, userId, postId, parentId, createdAt) VALUES (?,?,?,?,?)`, [comment.text, comment.userId, comment.postId, comment.parentId, null],
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
          posts.id AS posts_id,
          posts.title AS posts_title,
          posts.url AS posts_url,
          posts.userId AS posts_userId,
          posts.createdAt AS posts_createdAt,
          posts.updatedAt AS posts_updatedAt,
          c1.id AS c1_id,
          c1.text AS c1_text,
          c1.createdAt AS c1_createdAt,
          c1.updatedAt AS c1_updatedAt,
          c2.id AS c2_id,
          c2.text AS c2_text,
          c2.createdAt AS c2_createdAt,
          c2.updatedAt AS c2_updatedAt
          FROM posts
          LEFT JOIN comments AS c1 ON posts.id = c1.postId
          LEFT JOIN comments AS c2 ON c1.postId=c2.parentId
          WHERE posts.id= ? AND c1.parentId IS NULL`, [postId],
        function(err, results) {
          if (err) {
            callback(err)
          }
          else {
            var outPut = [];

            results.forEach(function(obj) {
              outPut.push({
                postId: obj.c1_id,
                text: obj.c1_text,
                createdAt: obj.c1_createdAt,
                updatedAt: obj.c1_updatedAt,
                replies: [{
                  replyId: obj.c2_id,
                  text: obj.c2_text,
                  createdAt: obj.c2_createdAt,
                  updatedAt: obj.c2_updatedAt
                }]
              })
            })
            callback(null, outPut);
          }
        })
    },
    getComments: function(maxLevel, parentIds, commentsMap, finalComments, callback) {
      var query;
      if (!callback) {
        // first time function is called
        callback = parentIds;
        parentIds = [];
        commentsMap = {};
        finalComments = [];
        query = 'select * from comments where parentId is null';
      }
      else if (maxLevel === 0 || parentIds.length === 0) {
        callback(null, finalComments);
        return;
      }
      else {
        query = 'select * from comments where parentId in (' + parentIds.join(',') + ')';
      }

      conn.query(query, function(err, res) {
        if (err) {
          callback(err);
          return;
        }
        res.forEach(
          function(comment) {
            commentsMap[comment.id] = comment;
            if (comment.parentId === null) {
              finalComments.push(comment);
            }
            else {
              var parent = commentsMap[comment.parentId];
              parent.replies = parent.replies || [];
              parent.replies.push(comment);
            }
          }
        );

        var newParentIds = res.map(function(item) {
          return item.id;
        });
        RedditAPI.getComments(maxLevel - 1, newParentIds, commentsMap, finalComments, callback);
      });
    },
    checkLogin: function(username, password, callback) {

      conn.query("SELECT * FROM users WHERE username = ?", [username], function(err, result) {
        if (result.length === 0) {
          callback(new Error('username or password incorrect')); // in this case the user does not exists
        }
        else {
          var user = result[0];
          var actualHashedPassword = result[0].password;
          bcrypt.compare(password, actualHashedPassword, function(err, res) {
            if (res === true) { // let's be extra safe here
              callback(null, user);
            }
            else {
              callback(new Error('username or password incorrect')); // in this case the password is wrong, but we reply with the same error
            }
          })
        }
      })
    },
    createSessionToken: function() {
      return secureRandom.randomArray(100).map(code => code.toString(36)).join('');
    },
    createSession: function(userId, callback) {
      var token = this.createSessionToken();
      conn.query('INSERT INTO sessions SET userId = ?, token = ?', [userId, token], function(err, result) {
        if (err) {
          callback(err);
        }
        else {
          callback(null, token);
        }
      })
    },
    getUserFromSession: function(cookie, callback) {
      conn.query(`SELECT userId FROM sessions WHERE token = ?`, [cookie], function(err, result) {
        if (err) {
          callback(err)
        }
        else if (result.length === 0) {
          callback()
        }
        else {
          callback(null, result[0].userId)
        }
      })
    },


    createVote: function(vote, callback) {
      conn.query(`INSERT INTO votes SET postId= ?, userId=?, vote=?, createdAt=? ON DUPLICATE KEY UPDATE vote=?`, [vote.postId, vote.userId, vote.vote, null, vote.vote], function(err, result) {
        if (err) {
          callback(err)
        }
        else {
          callback(null, result)
        }
      })
    },

    getAllPostsSorted: function(sortBy, callback) {

      if (sortBy === "top") {

        conn.query(`
      SELECT
        vote,
        posts.id AS posts_id,
        title,
        url,
        posts.userId AS posts_userId,
        posts.createdAt AS posts_createdAt,
        posts.updatedAt AS posts_updatedAt,
        users.id,
        username,
        users.createdAt AS users_createdAt,
        users.updatedAt AS users_updatedAt,
        subreddits.name AS subreddits_name
      FROM posts
      JOIN users ON users.id=posts.userId
      LEFT JOIN subreddits ON subreddits.id = posts.subredditId
      JOIN votes ON votes.postId = posts.id
      ORDER BY votes.createdAt DESC
      `,
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
                  userId: obj.posts_userId,
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
        )
      }
      else if (sortBy === 'new') {
        conn.query(`
      SELECT
        vote,
        posts.id AS posts_id,
        title,
        url,
        posts.userId AS posts_userId,
        posts.createdAt AS posts_createdAt,
        posts.updatedAt AS posts_updatedAt,
        users.id,
        username,
        users.createdAt AS users_createdAt,
        users.updatedAt AS users_updatedAt,
        subreddits.name AS subreddits_name
      FROM posts
      JOIN users ON users.id=posts.userId
      LEFT JOIN subreddits ON subreddits.id = posts.subredditId
      JOIN votes ON votes.postId = posts.id
      ORDER BY posts.createdAt DESC
      `,
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
                  userId: obj.posts_userId,
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
        )
      }
      else if (sortBy === 'hot') {
        conn.query(`
      SELECT
        vote,
        posts.id AS posts_id,
        title,
        url,
        posts.userId AS posts_userId,
        posts.createdAt AS posts_createdAt,
        posts.updatedAt AS posts_updatedAt,
        users.id,
        username,
        users.createdAt AS users_createdAt,
        users.updatedAt AS users_updatedAt,
        subreddits.name AS subreddits_name,
        (SUM(IFNULL(votes.vote, 0)) / TIMESTAMPDIFF(HOUR, posts.createdAt, CURRENT_TIMESTAMP)) AS timeScore
      FROM posts
      LEFT JOIN users ON users.id=posts.userId
      LEFT JOIN subreddits ON subreddits.id = posts.subredditId
      JOIN votes ON votes.postId = posts.id
      GROUP BY posts.id
      ORDER BY timeScore DESC
      LIMIT 25
      `,
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
                  userId: obj.posts_userId,
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
        )
      }
    },
    logOut: function(userId, token, callback) {
      conn.query(`DELETE FROM sessions WHERE userId=? AND token=? LIMIT 1`, [userId, token],
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
}
