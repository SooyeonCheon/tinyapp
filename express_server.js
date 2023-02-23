const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require('bcryptjs');
const app = express();
const PORT = 8080;

// config
app.set("view engine", "ejs");
// middleware
app.use(cookieParser()); // populate req.cookies
app.use(express.urlencoded({ extended: true }));

// url, user obj
const urlDatabase = {
  b6UTxQ: {
    longURL: "https://www.tsn.ca",
    userID: "userRandomID",
  },
  i3BoGr: {
    longURL: "https://www.google.ca",
    userID: "user2RandomID",
  },
};

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
};

// functions
const generateRandomString = function() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randomString = "";
  while (randomString.length < 6) {
    randomString += chars[Math.floor(Math.random() * chars.length)];
  }
  return randomString;
};

const getUserByEmail = function(email) {
  for (let user in users) {
    if (users[user].email === email) {
      return users[user];
    }
  }
  return null;
};

const urlsForUser = function(id) {
  let usersURLs = {};
  for (const shorten in urlDatabase) {
    if (id === urlDatabase[shorten].userID) {
      usersURLs[shorten] = urlDatabase[shorten].longURL;
    }
  }
  return usersURLs;
};

const findURLid = function(id) {
  for (let key in urlDatabase) {
    if (key === id) {
      return id;
    }
  }
  return null;
};

app.get("/", (req, res) => {
  res.send("Hello!");
});

// main page
app.get("/urls", (req, res) => {
  if (!req.cookies["user_id"]) {
    res.status(400).send("Please Login first.<br><a href='/login'>Login</a>");
    return;
  };
  // only shows the urls made by the user
  const usersURLs = urlsForUser(req.cookies["user_id"]);
  const templateVars = {
    urls: usersURLs,
    user: users[req.cookies["user_id"]],
  };
  res.render("urls_index", templateVars);
});

// creating page
app.get("/urls/new", (req, res) => {
  if (!req.cookies["user_id"]) {
    res.redirect("/login");
  }
  const templateVars = {
    user: users[req.cookies["user_id"]],
  };
  res.render("urls_new", templateVars);
});

// create a new short URL
app.post("/urls", (req, res) => {
  if (!req.cookies["user_id"]) {
    return res.status(400).send("You cannot shorten URLs. Please Login first.<br><a href='/login'>Login</a>");
  };
  let newId = generateRandomString();
  let userID = req.cookies["user_id"];
  urlDatabase[newId] = {
    longURL: req.body.longURL,
    userID: userID
  };
  console.log(urlDatabase);
  res.redirect(`/urls/${newId}`);
});

// short, long url information
app.get("/urls/:id", (req, res) => {
  if (!req.cookies["user_id"]) {
    return res.status(400).send("Please Login first.<br><a href='/login'>Login</a>");
  };
  const findID = findURLid(req.params.id);
  if (!findID) {
    return res.status(400).send("The shortened url does not exist");
  };
  const templateVars = {
    id: req.params.id,
    longURL: urlDatabase[req.params.id].longURL,
    user: users[req.cookies["user_id"]]
  };
  res.render("urls_show", templateVars);
});

// edit
app.post("/urls/:id", (req, res) => {
  const id = req.params.id;
  if (!req.cookies["user_id"] || (urlDatabase[id].userID !== req.cookies["user_id"])) {
    return res.status(400).send("You have no authority.");
  }
  const findID = findURLid(req.params.id);
  if (!findID) {
    return res.status(400).send("The shortened url does not exist");
  };
  urlDatabase[id].longURL = req.body.newUrl;
  res.redirect("/urls");
});

// delete
app.post("/urls/:id/delete", (req, res) => {
  const id = req.params.id;
  if (!req.cookies["user_id"] || (urlDatabase[id].userID !== req.cookies["user_id"])) {
    return res.status(400).send("You have no authority.");
  }
  const findID = findURLid(req.params.id);
  if (!findID) {
    return res.status(400).send("The shortened url does not exist");
  };
  delete urlDatabase[id];
  res.redirect("/urls");
});

// using short url go to the page
app.get("/u/:id", (req, res) => {
  const findID = findURLid(req.params.id);
  if (!findID) {
    return res.status(400).send("The shortened url does not exist");
  };
  const longURL = urlDatabase[req.params.id].longURL;
  res.redirect(longURL);
});

// login page
app.get("/login", (req, res) => {
  if (req.cookies["user_id"]) {
    res.redirect("/urls");
  }
  const templateVars = {
    user: users[req.cookies["user_id"]],
  };
  res.render("urls_login", templateVars);
});

// login with email & password
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  if (!email || !password) {
    return res.status(400).send("Please enter e-mail and password<br><a href='/login'>Login</a>");
  }
  let foundUser = null;
  for (const userId in users) {
    const user = users[userId];
    if (user.email === email) {
      foundUser = user;
    }
  }
  if (!foundUser) {
    return res.status(403).send("No user with that email found<br><a href='/login'>Login</a>");
  }
  if (!bcrypt.compareSync(password, foundUser.password)) {
    return res.status(403).send("Passwords do not match<br><a href='/login'>Login</a>");
  }

  res.cookie("user_id", foundUser.id);
  res.redirect("/urls");
});

// logout, cookie reset
app.get("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/login");
});

// user register page
app.get("/register", (req, res) => {
  if (req.cookies["user_id"]) {
    res.redirect("/urls");
  };
  const templateVars = {
    user: users[req.cookies["user_id"]],
  };
  res.render("urls_register", templateVars);
});

// new user register
app.post("/register", (req, res) => {
  const randomID = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUserObj = {
    id: randomID,
    email: email,
    password: hashedPassword,
  };

  if (!email || !password) {
    return res.status(400).send("Please enter e-mail and password");
  }
  const userEmail = getUserByEmail(email);
  if (userEmail) {
    return res.status(400).send("The e-mail already exists");
  }

  users[randomID] = newUserObj;
  res.cookie("user_id", randomID);
  console.log(users);
  res.redirect("/urls");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
