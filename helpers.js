const generateRandomString = function() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randomString = "";
  while (randomString.length < 6) {
    randomString += chars[Math.floor(Math.random() * chars.length)];
  }
  return randomString;
};

const getUserByEmail = function(email, database) {
  for (let user in database) {
    if (database[user].email === email) {
      return database[user].id;
    }
  }
  return undefined;
};

const urlsForUser = function(id, database) {
  let usersURLs = {};
  for (const shorten in database) {
    if (id === database[shorten].userID) {
      usersURLs[shorten] = database[shorten].longURL;
    }
  }
  return usersURLs;
};

const findURLid = function(id, database) {
  for (let key in database) {
    if (key === id) {
      return id;
    }
  }
  return null;
};

module.exports = { generateRandomString, getUserByEmail, urlsForUser, findURLid };
