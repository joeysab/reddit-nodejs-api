-- This creates the users table. The username field is constrained to unique
-- values only, by using a UNIQUE KEY on that column
CREATE TABLE `users` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(60) NOT NULL, -- why 60??? ask me :)
  `createdAt` TIMESTAMP NOT NULL DEFAULT 0,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- This creates the posts table. The userId column references the id column of
-- users. If a user is deleted, the corresponding posts' userIds will be set NULL.
CREATE TABLE `posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(300) DEFAULT NULL,
  `url` varchar(2000) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT 0,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;






CREATE TABLE `subreddits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(30) NOT NULL,
  `description` varchar(200) DEFAULT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT 0,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;


ALTER TABLE `posts`
ADD FOREIGN KEY (`subredditId`)
REFERENCES `users`(`id`)

ALTER TABLE `posts` ADD `subredditId` INT;



CREATE TABLE `comments` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `text` VARCHAR(10000),
  `createdAt` TIMESTAMP NOT NULL DEFAULT 0,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `userId` INT, 

  `postId` INT, 
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`),
  FOREIGN KEY (`postId`) REFERENCES `posts`(`id`)
  )ENGINE=InnoDB DEFAULT CHARSET=utf8;
  
  
  
  ALTER TABLE `comments` ADD parentId INT;
  
    ALTER TABLE `comments` ADD FOREIGN KEY (`parentId`) REFERENCES `comments`(`id`);

CREATE TABLE sessions (userId INT NOT NULL, token VARCHAR(255) NOT NULL)
}

ALTER TABLE sessions ADD FOREIGN KEY (`userId`) REFERENCES `users`(`id`);


CREATE TABLE votes (postId INT, userId INT);
]


ALTER TABLE votes
ADD FOREIGN KEY (userId)
REFERENCES users(id);


ALTER TABLE votes
ADD FOREIGN KEY (postId)
REFERENCES posts(id);


ALTER TABLE votes
ADD vote INT;

ALTER TABLE votes
ADD createdAt timestamp;


ALTER TABLE votes
ADD voteScore INT;