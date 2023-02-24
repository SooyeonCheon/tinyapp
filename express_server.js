const express = require("express");
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const methodOverride = require('method-override');
const { generateRandomString, getUserByEmail, urlsForUser, findURLid } = require('./helpers');
const app = express();
const PORT = 8080;

// config
app.set("view engine", "ejs");
// middleware
app.use(express.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2']
}));
app.use(methodOverride('_method'));

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

app.get("/", (req, res) => {
  if (!req.session.user_id) {
    res.redirect('login');
    return;
  }
  res.redirect('urls');
});

// main page
app.get("/urls", (req, res) => {
  if (!req.session.user_id) {
    res.status(400).send("Please Login first.<br><a href='/login'>Login</a>");
    return;
  };
  // only shows the urls made by the user
  const usersURLs = urlsForUser(req.session.user_id, urlDatabase);
  const templateVars = {
    urls: usersURLs,
    user: users[req.session.user_id],
  };
  res.render("urls_index", templateVars);
});

// creating page
app.get("/urls/new", (req, res) => {
  if (!req.session.user_id) {
    res.redirect("/login");
  }
  const templateVars = {
    user: users[req.session.user_id],
  };
  res.render("urls_new", templateVars);
});

// create a new short URL
app.post("/urls", (req, res) => {
  if (!req.session.user_id) {
    return res.status(400).send("You cannot shorten URLs. Please Login first.<br><a href='/login'>Login</a>");
  };
  let newId = generateRandomString();
  let userID = req.session.user_id;
  urlDatabase[newId] = {
    longURL: req.body.longURL,
    userID: userID
  };
  console.log(urlDatabase);
  res.redirect(`/urls/${newId}`);
});

// short, long url information
app.get("/urls/:id", (req, res) => {
  const findID = findURLid(req.params.id, urlDatabase);
  if (!findID) {
    return res.status(400).send("The shortened url does not exist");
  };
  if (!req.session.user_id) {
    return res.status(400).send("Please Login first.<br><a href='/login'>Login</a>");
  };
  if (urlDatabase[req.params.id].userID !== req.session.user_id) {
    return res.status(400).send("You have no authority.");
  };
  const templateVars = {
    id: req.params.id,
    longURL: urlDatabase[req.params.id].longURL,
    user: users[req.session.user_id]
  };
  res.render("urls_show", templateVars);
});

// edit
app.put("/urls/:id", (req, res) => {
  const id = req.params.id;
  if (!req.session.user_id || (urlDatabase[id].userID !== req.session.user_id)) {
    return res.status(400).send("You have no authority.");
  }
  const findID = findURLid(req.params.id, urlDatabase);
  if (!findID) {
    return res.status(400).send("The shortened url does not exist");
  };
  urlDatabase[id].longURL = req.body.newUrl;
  res.redirect("/urls");
});

// delete
app.delete("/urls/:id/delete", (req, res) => {
  const id = req.params.id;
  if (!req.session.user_id || (urlDatabase[id].userID !== req.session.user_id)) {
    return res.status(400).send("You have no authority.");
  }
  const findID = findURLid(req.params.id, urlDatabase);
  if (!findID) {
    return res.status(400).send("The shortened url does not exist");
  };
  delete urlDatabase[id];
  res.redirect("/urls");
});

// using short url go to the page
app.get("/u/:id", (req, res) => {
  const findID = findURLid(req.params.id, urlDatabase);
  if (!findID) {
    return res.status(400).send("The shortened url does not exist");
  };
  const longURL = urlDatabase[req.params.id].longURL;
  res.redirect(longURL);
});

// login page
app.get("/login", (req, res) => {
  if (req.session.user_id) {
    res.redirect("/urls");
  }
  const templateVars = {
    user: users[req.session.user_id],
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

  // res.cookie("user_id", foundUser.id);
  req.session.user_id = foundUser.id;
  res.redirect("/urls");
});

// logout, cookie reset
app.get("/logout", (req, res) => {
  req.session = null;
  res.redirect("/login");
});

// user register page
app.get("/register", (req, res) => {
  if (req.session.user_id) {
    res.redirect("/urls");
  };
  const templateVars = {
    user: users[req.session.user_id],
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
  const userEmail = getUserByEmail(email, users);
  if (userEmail) {
    return res.status(400).send("The e-mail already exists");
  }

  users[randomID] = newUserObj;
  req.session.user_id = randomID;
  console.log(users);
  res.redirect("/urls");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
